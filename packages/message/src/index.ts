import { Task, TKey } from './task';
import { MessageTimeoutException, MessageChannelCloseException } from './exceptions';
import { Exception } from '@typeservice/exception';

export * from './task';
export * from './exceptions';

const defaultId = 1;

/**
 * 1: 请求模型
 *  11: 发送请求
 *  10: 响应失败
 *  12: 响应成功
 * 2: 订阅模型
 *  21: 发送订阅
 *  20: 订阅失败
 *  22: 订阅成功
 * 3: 取消订阅模型
 *  31: 发送取消
 *  30: 取消失败
 *  32: 取消成功
 * 4: 发布模型
 */
export enum MODE {
  REQUEST_ERROR = 10,
  REQUEST = 11,
  REQUEST_SUCCESS = 12,
  SUBSCRIBE_ERROR = 20,
  SUBSCRIBE = 21,
  SUBSCRIBE_SUCCESS = 22,
  UNSUBSCRIBE_ERROR = 30,
  UNSUBSCRIBE = 31,
  UNSUBSCRIBE_SUCCESS = 32,
  PUBLISH = 4,
}

interface TCallbackState {
  resolve: (data: any) => void,
  reject: (e: any) => void,
}

interface TMessageState<T = any> {
  id: number,
  mode: MODE,
  twoway?: boolean,
  data: T,
}

export class Messager extends Task {
  private sender: (data: TMessageState) => void;
  private id = defaultId;
  private readonly callbacks = new Map<number, TCallbackState>();
  public disabled = false;
  public last_read_time = Date.now();
  public last_write_time = Date.now();
  public setSender(sender: (data: TMessageState) => void) {
    this.sender = sender;
    return this;
  }

  public disable() {
    this.id = defaultId;
    this.disabled = true;
    this.callbacks.clear();
  }

  public reset() {
    this.id = defaultId;
    this.disabled = false;
    this.callbacks.clear();
  }

  public publish(args: any[]) {
    if (this.disabled) throw new MessageChannelCloseException();
    this.sender({
      id: 0,
      mode: MODE.PUBLISH,
      twoway: false,
      data: args,
    })
  }

  public subscribe(data: any[], timeout?: number) {
    return this.makePromise<void>(id => this.sender({
      id,
      mode: MODE.SUBSCRIBE,
      twoway: true,
      data: data,
    }), timeout);
  }

  public unsubscribe(data: any[], timeout?: number) {
    return this.makePromise<void>(id => this.sender({
      id,
      mode: MODE.UNSUBSCRIBE,
      twoway: true,
      data: data,
    }), timeout);
  }

  public send(data: any[]) {
    if (this.disabled) throw new MessageChannelCloseException();
    this.sender({
      id: 0,
      mode: MODE.REQUEST,
      twoway: false,
      data
    })
    this.last_write_time = Date.now();
  }

  public sendback<T>(data: any[], timeout?: number) {
    return this.makePromise<T>(id => this.sender({
      id,
      mode: MODE.REQUEST,
      twoway: true,
      data,
    }), timeout);
  }

  public createReceiver() {
    return (request: any) => {
      if (this.disabled) return;
      request = (typeof Buffer !== 'undefined' && Buffer.isBuffer(request)) ? Buffer.from(request).toString() : request;
      const req = typeof request === 'string' 
        ? JSON.parse(request) as TMessageState
        : request;

      this.last_read_time = Date.now();

      switch (req.mode) {
        case MODE.REQUEST_ERROR:        this._responseError(req); break;
        case MODE.REQUEST:              this._request(req); break;
        case MODE.REQUEST_SUCCESS:      this._responseSuccess(req); break;
        case MODE.SUBSCRIBE_ERROR:      this._responseError(req); break;
        case MODE.SUBSCRIBE:            this._subscribe(req); break;
        case MODE.SUBSCRIBE_SUCCESS:    this._responseSuccess(req); break;
        case MODE.UNSUBSCRIBE_ERROR:    this._responseError(req); break;
        case MODE.UNSUBSCRIBE:          this._unsubscribe(req); break;
        case MODE.UNSUBSCRIBE_SUCCESS:  this._responseSuccess(req); break;
        case MODE.PUBLISH:              this._publish(req); break;
      }
    } 
  }

  private _request(req: TMessageState) {
    return this.makePromiseResult('request', req, [MODE.REQUEST_SUCCESS, MODE.REQUEST_ERROR]);
  }

  private _responseSuccess(req: TMessageState) {
    if (req.id && this.callbacks.has(req.id)) {
      const injection = this.callbacks.get(req.id);
      this.callbacks.delete(req.id);
      injection.resolve(req.data);
    }
  }

  private _responseError(req: TMessageState<{ status: number, message: string[] }>) {
    if (req.id && this.callbacks.has(req.id)) {
      const { status, message } = req.data;
      const injection = this.callbacks.get(req.id);
      this.callbacks.delete(req.id);
      injection.reject(new Exception(status, ...message));
    }
  }

  private _subscribe(req: TMessageState) {
    return this.makePromiseResult('subscribe', req, [MODE.SUBSCRIBE_SUCCESS, MODE.SUBSCRIBE_ERROR]);
  }

  private _unsubscribe(req: TMessageState) {
    return this.makePromiseResult('unsubscribe', req, [MODE.UNSUBSCRIBE_SUCCESS, MODE.UNSUBSCRIBE_ERROR]);
  }

  private _publish(req: TMessageState) {
    return this.emit('publish', req.data);
  }

  private makePromise<T = any>(callback: (id: number) => void, timeout: number = 60 * 1000) {
    if (this.disabled) return Promise.reject(new MessageChannelCloseException());
    let id = this.id++;
    if (id >= Number.MAX_SAFE_INTEGER) {
      id = this.id = defaultId;
    }
    return new Promise<T>((resolve, reject) => {
      const _resolve = (state: T) => {
        clearTimeout(timer);
        resolve(state);
      }
      const _reject = (e: any) => {
        clearTimeout(timer);
        reject(e);
      }
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        _reject(new MessageTimeoutException(timeout));
      }, timeout);
      this.callbacks.set(id, { resolve: _resolve, reject: _reject });
      callback(id);
      this.last_write_time = Date.now();
    })
  }

  private makePromiseResult(eventname: TKey, req: TMessageState, status: [MODE, MODE]) {
    return this.emit(eventname, req.data).then((res: any) => {
      if (req.twoway && !this.disabled) {
        this.sender({
          id: req.id,
          mode: status[0],
          twoway: false,
          data: res,
        })
      }
    }).catch(e => {
      if (req.twoway && !this.disabled) {
        this.sender({
          id: req.id,
          mode: status[1],
          twoway: false,
          data: {
            status: Exception.isException(e) ? e.code : 500,
            message: Exception.isException(e) ? e.messages : [e.message],
          }
        })
      }
    });
  }
}