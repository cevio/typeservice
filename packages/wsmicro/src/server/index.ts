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

  public createService<T>(clazz: interfaces.Newable<T>) {
    const instance = ClassMetaCreator.instance(clazz);
    if (instance.has(ServiceNameSpace) && !this.container.isBound(clazz)) {
      const namespace = instance.get<string>(ServiceNameSpace);
      const methods = this.getMehtodsByNamespace(clazz, PublicNameSpace);
      const subscribes = this.getMehtodsByNamespace(clazz, SubscribeNameSpace);
      const publishes = this.getMehtodsByNamespace(clazz, PublishNameSpace);
      AnnotationDependenciesAutoRegister(clazz, this.container);
      this.services.set(namespace, {
        ref: clazz,
        methods, publishes, subscribes,
      })
    }
    return this;
  }

  private getMehtodsByNamespace<T>(clazz: interfaces.Newable<T>, namespace: string) {
    return Object.getOwnPropertyNames(clazz.prototype).filter(name => {
      if (name === 'constructor') return false;
      if (typeof clazz.prototype[name] !== 'function') return false;
      const obj = Object.getOwnPropertyDescriptor(clazz.prototype, name);
      const instance = MethodMetaCreator.instance(obj);
      return instance.has(namespace) && !!instance.get(namespace);
    });
  }

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
      });
    })
    for (const [key, { publishes, ref }] of this.services) {
      const object = this.container.get(ref);
      for (let i = 0; i < publishes.length; i++) {
        const publishName = publishes[i];
        const effection = effect(() => {
          const res = object[publishName]();
          this.publish(key, publishName, res);
          return res;
        })
        this.effections.add(effection);
      }
    }
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

  private publish<T = any>(intername: string, method: string, state: T) {
    const key = intername + ':' + method;
    if (this.subscribes.has(key)) {
      const chunks = this.subscribes.get(key);
      for (const socket of chunks.values()) {
        socket.publish(intername, method, state);
      }
    }
  }

  public subscribe(intername: string, method: string, socket: Socket) {
    if (!this.services.has(intername)) throw new InterfaceNotFoundException(intername);
    const { publishes } = this.services.get(intername);
    if (!publishes.includes(method)) throw new MethodNotFoundException(intername, method);
    const key = intername + ':' + method;
    if (!this.subscribes.has(key)) {
      this.subscribes.set(key, new Set());
    }
    const chunks = this.subscribes.get(key);
    chunks.add(socket);
    const object = this.container.get(this.services.get(intername).ref);
    const res = object[method]();
    socket.publish(intername, method, res);
  }

  public unsubscribe(intername: string, method: string, socket: Socket) {
    if (!this.services.has(intername)) throw new InterfaceNotFoundException(intername);
    const { publishes } = this.services.get(intername);
    if (!publishes.includes(method)) throw new MethodNotFoundException(intername, method);
    const key = intername + ':' + method;
    if (!this.subscribes.has(key)) return;
    const chunks = this.subscribes.get(key);
    if (chunks.has(socket)) {
      chunks.delete(socket);
    }
  }

  public async execute<T>(intername: string, method: string, args: any[] = []) {
    if (!this.services.has(intername)) throw new InterfaceNotFoundException(intername);
    const { ref, methods } = this.services.get(intername);
    if (!methods.includes(method)) throw new MethodNotFoundException(intername, method);
    return await Promise.resolve<T>(this.container.get(ref)[method](...args));
  }
}