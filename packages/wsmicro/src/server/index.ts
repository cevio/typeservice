import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { Socket } from './socket';
import { TServiceState } from './interface';
import { Container, interfaces } from 'inversify';
import { effect, stop, ReactiveEffectRunner } from '@vue/reactivity';
import { InterfaceNotFoundException, MethodNotFoundException } from '../exceptions';
import { ServiceNameSpace, PublicNameSpace, PublishNameSpace, SubscribeNameSpace } from '../decorators';
import { ClassMetaCreator, MethodMetaCreator, AnnotationDependenciesAutoRegister } from '@typeservice/decorator';

export * from './interface';
export * from './socket';
export class Server extends EventEmitter {
  private connection: WebSocketServer;
  private readonly sockets = new Set<Socket>();
  public readonly services = new Map<string, TServiceState<any>>();
  private readonly effections = new Set<ReactiveEffectRunner>();
  private readonly subscribes = new Map<string, Set<Socket>>();
  private _heartbeat = 5000;
  constructor(private readonly container: Container) {
    super();
    this.setMaxListeners(+Infinity);
  }

  get heartbeat() {
    return this._heartbeat;
  }

  public setHeartBeat(i: number) {
    this._heartbeat = i;
    return this;
  }

  /**
   * 注册服务类
   * @param clazz 服务类
   * @returns
   */
  public createService<T>(clazz: interfaces.Newable<T>) {
    const instance = ClassMetaCreator.instance(clazz);
    if (instance.has(ServiceNameSpace)) {
      const namespace = instance.get<string>(ServiceNameSpace);
      const methods = this.getMehtodsByNamespace(clazz, PublicNameSpace);
      const subscribes = this.getMehtodsByNamespace(clazz, SubscribeNameSpace);
      const publishes = this.getMehtodsByNamespace(clazz, PublishNameSpace);
      AnnotationDependenciesAutoRegister(clazz, this.container);
      this.services.set(namespace, {
        ref: clazz,
        methods, publishes, subscribes,
      })

      for (let i = 0; i < publishes.length; i++) {
        const effection = this.createPublishEffection(namespace, clazz, publishes[i]);
        this.effections.add(effection);
      }
    }
    return this;
  }

  /**
   * 创建Publish响应方法
   * @param namespace 
   * @param clazz 
   * @param method 
   */
  private createPublishEffection<T, O>(namespace: string, clazz: interfaces.Newable<T>, method: string) {
    const object = this.container.get(clazz);
    const obj = Object.getOwnPropertyDescriptor(clazz.prototype, method);
    const instance = MethodMetaCreator.instance(obj);
    const value = instance.get(PublishNameSpace) as ((newValue: O, oldValue: O) => boolean) | boolean;
    let old: O = null;
    return effect(() => {
      // @ts-ignore
      const fn = object[method] as () => O;
      const oldValue = old;
      const newValue = fn();
      old = newValue;
      if (typeof value === 'function') {
        if (value(newValue, oldValue)) {
          this.publish(namespace, method, newValue);
        }
      } else if (typeof value === 'boolean' && value) {
        this.publish(namespace, method, newValue);
      }
      return newValue;
    }, { lazy: true });
  }

  /**
   * 取得带有某个特征的方法集合
   * @param clazz 
   * @param namespace 
   * @returns 
   */
  private getMehtodsByNamespace<T>(clazz: interfaces.Newable<T>, namespace: string) {
    return Object.getOwnPropertyNames(clazz.prototype).filter(name => {
      if (name === 'constructor') return false;
      if (typeof clazz.prototype[name] !== 'function') return false;
      const obj = Object.getOwnPropertyDescriptor(clazz.prototype, name);
      const instance = MethodMetaCreator.instance(obj);
      return instance.has(namespace);
    });
  }

  /**
   * 启动服务
   * @param port 服务的端口
   */
  public listen(port: number) {
    this.connection = new WebSocketServer({ port, maxPayload: Infinity });
    this.connection.on('connection', (socket, request) => {
      const so = new Socket(this, socket, request);
      this.sockets.add(so);
      so.on('close', () => {
        for (const sockets of this.subscribes.values()) {
          if (sockets.has(so)) {
            sockets.delete(so);
          }
        }
        this.sockets.delete(so);
        this.emit('disconnect', so);
      });
      this.emit('connect', so);
    })
    this.effections.forEach(effection => effection());
  }

  public close() {
    for (const effection of this.effections.values()) stop(effection);
    for (const socket of this.sockets.values()) socket.close();
    this.effections.clear();
    this.sockets.clear();
    this.subscribes.clear();
    this.services.clear();
    this.connection.close();
  }

  /**
   * 向客户端发送订阅信息
   * @param intername 
   * @param method 
   * @param state 
   */
  private publish<T = any>(intername: string, method: string, state: T) {
    const key = intername + ':' + method;
    if (this.subscribes.has(key)) {
      const chunks = this.subscribes.get(key);
      for (const socket of chunks.values()) {
        socket.publish(intername, method, state);
      }
    }
  }

  /**
   * 加入服务端订阅
   * @param intername 
   * @param method 
   * @param socket 
   */
  public subscribe(intername: string, method: string, socket: Socket) {
    if (this.services.has(intername)) {
      const { publishes } = this.services.get(intername);
      if (publishes.includes(method)) {
        const key = intername + ':' + method;
        if (!this.subscribes.has(key)) {
          this.subscribes.set(key, new Set());
        }
        const chunks = this.subscribes.get(key);
        if (!chunks.has(socket)) {
          chunks.add(socket);
        }
        const object = this.container.get(this.services.get(intername).ref);
        const res = object[method]();
        socket.publish(intername, method, res);
        return true;
      }
    }
    return false;
  }

  /**
   * 取消服务端订阅
   * @param intername 
   * @param method 
   * @param socket 
   * @returns 
   */
  public unsubscribe(intername: string, method: string, socket: Socket) {
    if (this.services.has(intername)) {
      const { publishes } = this.services.get(intername);
      if (publishes.includes(method)) {
        const key = intername + ':' + method;
        if (!this.subscribes.has(key)) return false;
        const chunks = this.subscribes.get(key);
        if (chunks.has(socket)) {
          chunks.delete(socket);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * 执行服务端请求，得到结果后返回
   * @param intername 
   * @param method 
   * @param args 
   * @returns 
   */
  public async execute<T>(intername: string, method: string, args: any[] = []) {
    if (!this.services.has(intername)) throw new InterfaceNotFoundException(intername);
    const { ref, methods } = this.services.get(intername);
    if (!methods.includes(method)) throw new MethodNotFoundException(intername, method);
    return await Promise.resolve<T>(this.container.get(ref)[method](...args));
  }
}