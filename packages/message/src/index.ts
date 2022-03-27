import { Task } from './task';
import { MessageTimeoutException, MessageChannelCloseException } from './exceptions';
import { Exception } from '@typeservice/exception';

export * from './task';
export * from './exceptions';

const defaultId = 1;

interface TCallbackState {
  resolve: (data: any) => void,
  reject: (e: any) => void,
}

interface TMessageState {
  id: number,
  mode: 0 | 1 | 2 | 3 | 4, // 0 请求 1 响应 2 订阅 3 发布 4 取消订阅
  twoway?: boolean, // true 需要响应
  data: {
    request?: any,
    response?: {
      data?: any,
      status: number,
      msg?: any[]
    },
    subscribe?: any[],
    publish?: any[],
    unsubscribe?: any[],
  },
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

  public publish(...args: any[]) {
    if (this.disabled) throw new MessageChannelCloseException();
    this.sender({
      id: 0,
      mode: 3,
      twoway: false,
      data: {
        publish: args,
      }
    })
  }

  public subscribe(...args: any[]) {
    if (this.disabled) throw new MessageChannelCloseException();
    this.sender({
      id: 0,
      mode: 2,
      twoway: false,
      data: {
        subscribe: args,
      }
    })
  }

  public unsubscribe(...args: any[]) {
    if (this.disabled) throw new MessageChannelCloseException();
    this.sender({
      id: 0,
      mode: 4,
      twoway: false,
      data: {
        unsubscribe: args,
      }
    })
  }

  public send(data: any) {
    if (this.disabled) throw new MessageChannelCloseException();
    this.sender({
      id: 0,
      mode: 0,
      twoway: false,
      data: {
        request: data,
      }
    })
    this.last_write_time = Date.now();
  }

  public sendback<T>(data: any, timeout: number = 15 * 60 * 1000) {
    if (this.disabled) return Promise.reject(new MessageChannelCloseException());
    let id = this.id++;
    if (id >= Number.MAX_SAFE_INTEGER) {
      id = this.id = defaultId;
    }

    return new Promise((resolve, reject) => {
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
        _reject(new MessageTimeoutException(data, timeout));
      }, timeout);
      this.callbacks.set(id, {
        resolve: _resolve,
        reject: _reject,
      });
      this.sender({
        id,
        mode: 0,
        twoway: true,
        data: {
          request: data,
        }
      });
      this.last_write_time = Date.now();
    })
  }

  public createReceiver() {
    return (request: string | Buffer | TMessageState) => {
      if (this.disabled) return;
      request = Buffer.isBuffer(request) ? Buffer.from(request).toString() : request;
      const req = typeof request === 'string' 
        ? JSON.parse(request) as TMessageState
        : request;

      this.last_read_time = Date.now();

      switch (req.mode) {
        case 0: this._request(req); break;
        case 1: this._response(req); break;
        case 2: this._subscribe(req); break;
        case 3: this._publish(req); break;
        case 4: this._unsubscribe(req); break;
      }
    } 
  }

  private _request(req: TMessageState) {
    this.emit('request', req.data).then((res: any) => {
      if (req.twoway && !this.disabled) {
        this.sender({
          id: req.id,
          mode: 1,
          twoway: false,
          data: {
            response: {
              data: res,
              status: 200,
            }
          }
        })
      }
    }).catch(e => {
      if (req.twoway && !this.disabled) {
        this.sender({
          id: req.id,
          mode: 1,
          twoway: false,
          data: {
            response: {
              status: Exception.isException(e) ? e.code : 500,
              msg: Exception.isException(e) ? e.messages : [e.message],
            }
          }
        })
      }
    });
  }

  private _response(req: TMessageState) {
    if (req.id && this.callbacks.has(req.id)) {
      const response = req.data.response;
      const injection = this.callbacks.get(req.id);
      this.callbacks.delete(req.id);
      if (response.status === 200) {
        injection.resolve(response.data);
      } else {
        injection.reject(new Exception(response.status, ...response.msg));
      }
    }
  }

  private _subscribe(req: TMessageState) {
    this.emit('subscribe', ...req.data.subscribe);
  }

  private _publish(req: TMessageState) {
    this.emit('publish', ...req.data.publish);
  }

  private _unsubscribe(req: TMessageState) {
    this.emit('unsubscribe', ...req.data.unsubscribe);
  }
}