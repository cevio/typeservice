import * as Websocket from 'ws';
import { operation } from 'retry';
import { EventEmitter } from 'events';
import { Messager } from '@typeservice/message';
import { TRetryConfigs, TClientStackState } from './interface';
import { TCommunication } from '../server/interface';
export * from './interface';
export class Client extends EventEmitter {
  private readonly message = new Messager();
  private readonly stacks = new Set<TClientStackState<TCommunication | string[]>>();
  private status: -1 | 0 | 1 | 2 = 0;
  private connection: Websocket;

  private readonly subscribes = new Map<string, Set<(res: any) => void>>();

  constructor(
    private readonly host: string, 
    private readonly port: number,
    private readonly configs?: TRetryConfigs
  ) {
    super();
    this.on('open', () => this.executeSuccess());
    this.on('close', (e: any) => this.executeError(e));
    this.message.on('publish', (intername: string, method: string, res: any) => {
      const key = this.createSubscribeKey(intername, method);
      if (this.subscribes.has(key)) {
        const callbacks = this.subscribes.get(key);
        for (const callback of callbacks.values()) {
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
          for (const [key, callbacks] of this.subscribes) {
            const sp = key.split(':');
            for (const callback of callbacks.values()) {
              this.subscribe(sp[0], sp[1], callback);
            }
          }
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

  private execute(state: TClientStackState<TCommunication | string[]>) {
    switch (state.type) {
      case 0:
        if (state.backable) {
          this.message.sendback(state.data, state.timeout)
            .then(state.resolve)
            .catch(state.reject);
        } else {
          this.trySync(state, () => this.message.send(state.data));
        }
        break;
      case 2:
        const subscribeArgs = state.data as string[];
        this.trySync(state, () => this.message.subscribe(...subscribeArgs));
        break;
      case 4:
        const unsubscribeArgs = state.data as string[];
        this.trySync(state, () => this.message.unsubscribe(...unsubscribeArgs));
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
        type: 0,
        data: {
          interface: intername,
          method,
          arguments: args
        },
        backable: false,
        resolve, reject,
      })
      this.createCheckingStatus();
    })
  }

  public sendback<T>(intername: string, method: string, args: any[], timeout?: number) {
    return new Promise<T>((resolve, reject) => {
      this.stacks.add({
        type: 0,
        data: {
          interface: intername,
          method,
          arguments: args
        },
        backable: true,
        timeout, resolve, reject,
      })
      this.createCheckingStatus();
    })
  }

  public subscribe<T>(intername: string, method: string, callback: (res: T) => void) {
    return new Promise((resolve, reject) => {
      this.stacks.add({
        type: 2,
        data: [intername, method],
        backable: false,
        resolve, reject,
      })
      this.createCheckingStatus();
    }).then(() => {
      const key = this.createSubscribeKey(intername, method);
      if (!this.subscribes.has(key)) this.subscribes.set(key, new Set());
      const callbacks = this.subscribes.get(key);
      if (!callbacks.has(callback)) {
        callbacks.add(callback);
      }
      return async () => {
        if (callbacks.has(callback)) {
          callbacks.delete(callback);
        }
        if (!callbacks.size) {
          this.subscribes.delete(key);
          await this.unsubscribe(intername, method);
        }
      };
    })
  }

  public unsubscribe(intername: string, method: string) {
    const key = this.createSubscribeKey(intername, method);
    if (this.subscribes.has(key)) {
      this.subscribes.delete(key);
    }
    return new Promise((resolve, reject) => {
      this.stacks.add({
        type: 4,
        data: [intername, method],
        backable: false,
        resolve, reject,
      })
      this.createCheckingStatus();
    })
  }
}