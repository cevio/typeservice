import * as Websocket from 'ws';
import { operation } from 'retry';
import { EventEmitter } from 'events';
import { Messager } from '@typeservice/message';
import { TRetryConfigs, TClientStackState } from './interface';
import { TCommunication } from '../server/interface';
export * from './interface';

type TSubscribeFeedback = (res: any) => void;
type TUnSubscribeFeedback = () => Promise<void>;

export class Client extends EventEmitter {
  private readonly message = new Messager();
  private readonly stacks = new Set<TClientStackState<any[]>>();
  private status: -1 | 0 | 1 | 2 = 0;
  private connection: Websocket;

  public readonly subscribes = new Map<string, Map<TSubscribeFeedback, TUnSubscribeFeedback>>();

  constructor(
    private readonly host: string, 
    private readonly port: number,
    private readonly configs?: TRetryConfigs
  ) {
    super();
    this.on('open', () => this.executeSuccess());
    this.on('close', (e: any) => this.executeError(e));
    this.message.on('publish', (data: [string, string, any]) => {
      const [intername, method, res] = data;
      const key = this.createSubscribeKey(intername, method);
      if (this.subscribes.has(key)) {
        const callbacks = this.subscribes.get(key);
        for (const callback of callbacks.keys()) {
          callback(res);
        }
      }
    })
  }

  get id() {
    return this.host + ':' + this.port;
  }

  private createSubscribeKey(intername: string, method: string) {
    return intername + ':' + method;
  }

  private resetConnection() {
    this.message.disable();
    this.status = 0;
  }

  private createConnection() {
    if (this.status === 0) {
      this.status = 1;
      const oper = operation(this.configs);
      const onerror = (e: any) => {
        if (!oper.retry(e)) {
          this.status = -1;
          this.emit('close', oper.mainError());
        }
      };
      oper.attempt(() => {
        const ws = new Websocket('ws://' + this.id);
        ws.on('error', onerror);
        ws.on('close', () => {
          const _status = this.status;
          this.resetConnection();
          if (_status === 2) {
            this.connection.close();
            this.createConnection();
          }
        })
        ws.on('open', () => {
          ws.off('error', onerror);
          this.message.reset();
          this.message.setSender(data => ws.send(JSON.stringify(data)));
          ws.on('message', this.message.createReceiver());
          ws.on('error', e => this.emit('error', e));
          this.status = 2;
          this.connection = ws;
          this.emit('open');
          this.resubscribe();
        })
      })
    }
  }

  private createCheckingStatus() {
    switch (this.status) {
      case 2: this.executeSuccess(); break;
      case 0: this.createConnection(); break;
    }
  }

  private execute(state: TClientStackState<any[]>) {
    switch (state.type) {
      case 1:
        if (state.backable) {
          this.message.sendback(state.data, state.timeout).then(state.resolve).catch(state.reject);
        } else {
          this.trySync(state, () => this.message.send(state.data));
        }
        break;
      case 2:
        this.message.subscribe(state.data, state.timeout).then(state.resolve).catch(state.reject);
        break;
      case 3:
        this.message.unsubscribe(state.data, state.timeout).then(state.resolve).catch(state.reject);
        break;
    }
  }

  private trySync(state: TClientStackState<TCommunication | string[]>, callback: () => void) {
    try {
      callback();
      state.resolve();
    } catch (e) {
      state.reject(e);
    }
  }

  private executeSuccess() {
    const stacks = Array.from(this.stacks.values());
    this.stacks.clear();
    stacks.forEach(stack => this.execute(stack));
  }

  private executeError(e: any) {
    const stacks = Array.from(this.stacks.values());
    this.stacks.clear();
    stacks.forEach(stack => stack.reject(e));
    this.emit('end');
  }

  public send(intername: string, method: string, args: any[]) {
    return new Promise((resolve, reject) => {
      this.stacks.add({
        type: 1,
        data: [intername, method, args],
        backable: false,
        resolve, reject,
      })
      this.createCheckingStatus();
    })
  }

  public sendback<T>(intername: string, method: string, args: any[], timeout?: number) {
    return new Promise<T>((resolve, reject) => {
      this.stacks.add({
        type: 1,
        data: [intername, method, args],
        backable: true,
        timeout, resolve, reject,
      })
      this.createCheckingStatus();
    })
  }

  public subscribe<T>(intername: string, method: string, callback: (res: T) => void) {
    const key = this.createSubscribeKey(intername, method);
    if (!this.subscribes.has(key)) this.subscribes.set(key, new Map());
    const callbacks = this.subscribes.get(key);
    if (!callbacks.has(callback)) {
      const rollback = async () => {
        if (callbacks.has(callback)) {
          callbacks.delete(callback);
        }
        if (!callbacks.size) {
          this.subscribes.delete(key);
          await this.unsubscribe(intername, method);
        }
      }
      callbacks.set(callback, rollback);
    }
    const rollback = callbacks.get(callback);
    return new Promise((resolve, reject) => {
      this.stacks.add({
        type: 2,
        data: [intername, method],
        resolve, reject,
      })
      this.createCheckingStatus();
    }).then(() => {
      this.emit('subscribe:success', intername, method);
      return rollback;
    }).catch(e => {
      rollback();
      this.emit('subscribe:error', intername, method, e);
      return Promise.reject(e);
    })
  }

  public resubscribe(feedback?: (intername: string, method: string, callback: (res: any) => void) => Promise<TUnSubscribeFeedback>) {
    for (const [key, callbacks] of this.subscribes.entries()) {
      const sp = key.split(':');
      for (const callback of callbacks.keys()) {
        if (feedback) {
          feedback(sp[0], sp[1], callback);
        } else {
          this.subscribe(sp[0], sp[1], callback)
          .then(() => this.emit('resubscribe:success', sp[0], sp[1]))
          .catch(e => this.emit('resubscribe:error', sp[0], sp[1], e));
        }
      }
    }
  }

  public unsubscribe(intername: string, method: string) {
    const key = this.createSubscribeKey(intername, method);
    if (this.subscribes.has(key)) {
      this.subscribes.delete(key);
    }
    return new Promise((resolve, reject) => {
      this.stacks.add({
        type: 3,
        data: [intername, method],
        resolve, reject,
      })
      this.createCheckingStatus();
    })
  }
}