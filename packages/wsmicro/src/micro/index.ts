import { EventEmitter } from 'events';
import { Server, Socket, TServiceState } from '../server';
import { Client, TRetryConfigs } from '../client';
import { Container } from 'inversify';
import { InterfaceNamspace } from './namespace';
import { createClientKey } from './utils';
import { RegistryNotMatchedException } from '../exceptions';
import { MethodMetaCreator } from '@typeservice/decorator';
import { SubscribeNameSpace } from '../decorators';
import { TMicroServiceConfigs, TRegistry, TMicroServiceRequestProps } from './interface';

export * from './interface';
export * from './utils';
export * from './namespace';

export class MicroService extends EventEmitter {
  public readonly container: Container;
  private readonly registry: TRegistry;
  private readonly server: Server;
  private readonly retryConfigs: TRetryConfigs;
  private readonly registries = new Map<string, InterfaceNamspace>();
  private readonly clients = new Map<string, Client>();

  constructor(props: TMicroServiceConfigs) {
    super();
    this.setMaxListeners(+Infinity);
    this.registry = props.registry;
    this.retryConfigs = props.retry;
    this.container = props.container;
    props.container.bind<MicroService>(MicroService).toConstantValue(this);
    if (props?.services.length && props.container instanceof Container) {
      this.server = new Server(props.container);
      this.server.on('connect', (so: Socket) => this.emit('connect', so));
      this.server.on('disconnect', (so: Socket) => this.emit('disconnect', so));
      props.services.forEach(service => this.server.createService(service));
      if (props.heartbeat) {
        this.server.setHeartBeat(props.heartbeat);
      }
    }
  }

  get services() {
    return this.server ? this.server.services : new Map<string, TServiceState<any>>();
  }

  private createClient(host: string, port: number) {
    const key = createClientKey(host, port);
    if (!this.clients.has(key)) {
      const client = new Client(host, port, this.retryConfigs);
      client.on('end', () => {
        this.clients.delete(key);
        client.resubscribe((intername, method, feedback) => {
          return this.subscribe({
            interface: intername,
            method: method,
          }, feedback).then((callback) => {
            this.emit('resubscribe:success', intername, method);
            return callback;
          }).catch(e => {
            this.emit('resubscribe:error', intername, method, e);
            return Promise.reject(e);
          });
        });
      });
      this.clients.set(key, client);
    }
    return this.clients.get(key);
  }

  public async send<T = any>(props: Omit<TMicroServiceRequestProps<T>, 'timeout'>) {
    const current = await this.find(props.interface, props.method, 'methods', props.strategy);
    if (!current) throw new RegistryNotMatchedException('RegistryNotMatchedException', props.interface, props.method);
    const app = this.createClient(current.hostname, Number(current.port || 0));
    return await app.send(props.interface, props.method, props.arguments);
  }

  public async sendback<T, O = any>(props: TMicroServiceRequestProps<O>): Promise<T> {
    const current = await this.find(props.interface, props.method, 'methods', props.strategy);
    if (!current) throw new RegistryNotMatchedException('RegistryNotMatchedException', props.interface, props.method);
    const app = this.createClient(current.hostname, Number(current.port || 0));
    return await app.sendback(props.interface, props.method, props.arguments, props.timeout);
  }

  public async subscribe<T>(props: Omit<TMicroServiceRequestProps, 'arguments' | 'timeout'>, callback: (e: T) => void) {
    const current = await this.find(props.interface, props.method, 'publishes', props.strategy);
    if (!current) throw new RegistryNotMatchedException('RegistryNotMatchedException', props.interface, props.method);
    const app = this.createClient(current.hostname, Number(current.port || 0));
    return await app.subscribe(props.interface, props.method, callback).then(r => {
      this.emit('subscribe:success', props.interface, props.method);
      return r;
    }).catch(e => {
      this.emit('subscribe:error', props.interface, props.method, e);
      return Promise.reject(e);
    });
  }

  public async unsubscribe(props: Omit<TMicroServiceRequestProps, 'arguments' | 'timeout'>) {
    const current = await this.find(props.interface, props.method, 'publishes', props.strategy);
    if (!current) throw new RegistryNotMatchedException('RegistryNotMatchedException', props.interface, props.method);
    const app = this.createClient(current.hostname, Number(current.port || 0));
    return await app.unsubscribe(props.interface, props.method).then(r => {
      this.emit('unsubscribe:success', props.interface, props.method);
      return r;
    }).catch(e => {
      this.emit('unsubscribe:error', props.interface, props.method, e);
      return Promise.reject(e);
    });
  }

  private find(
    intername: string, 
    method: string, 
    type: 'methods' | 'publishes' | 'subscribes', 
    strategy?: TMicroServiceRequestProps['strategy'],
  ) {
    if (!this.registries.has(intername)) {
      this.registries.set(intername, new InterfaceNamspace(intername, this.registry, this.retryConfigs));
    }
    return this.registries.get(intername).get(method, type, strategy);
  }

  public async listen(port?: number) {
    if (port && this.server) {
      this.server.listen(port);
      for (const [namespace, { methods, subscribes, publishes }] of this.server.services) {
        await this.registry.mountProvider(namespace, port, {
          methods, subscribes, publishes
        });
      }
    }
    if (this?.server?.services) {
      for (const { ref, subscribes } of this.server.services.values()) {
        if (subscribes && subscribes.length) {
          const object = this.container.get(ref);
          for (let i = 0; i < subscribes.length; i++) {
            const method = subscribes[i];
            const instance = MethodMetaCreator.instance(Object.getOwnPropertyDescriptor(ref.prototype, method));
            if (instance.has(SubscribeNameSpace)) {
              const value = instance.get<{ interface: string, method: string }>(SubscribeNameSpace);
              await this.subscribe(value, res => object[method](res)).then((r) => {
                this.emit('autosubscribe:success', value.interface, value.method);
                return r;
              }).catch(e => {
                this.emit('autosubscribe:error', value.interface, value.method, e);
                return Promise.reject(e);
              });
            }
          }
        }
      }
    }
  }

  public async close() {
    if (this.server) {
      await this.registry.unmountAll();
      this.server.close();
    }
  }
}