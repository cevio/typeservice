import { Server as HttpServer } from 'http';
import { Socket, Server, ServerOptions } from 'socket.io';
import { Messager } from '@typeservice/message';
import { createContext } from '@typeservice/process';
import { MicroService, TMicroServiceRequestProps } from '@typeservice/wsmicro';
import { Exception } from '@typeservice/exception';
import type { Namespace } from 'socket.io';

export const CONTEXT_WEBSOCKET = createContext<Server>();

export class WebSocket extends Map<string, { unsubscribe: () => Promise<void>, stacks: Set<Messager>, value: any }> {
  private namespace: Namespace;
  constructor(
    private readonly micro: MicroService, 
    private readonly configs?: Partial<ServerOptions>
  ) {
    super();
  }

  public createWebSocketServer<T = any>(server: HttpServer, callback: (client: Socket) => T | Promise<T>) {
    const io = new Server(server, this.configs);
    CONTEXT_WEBSOCKET.setContext(io);
    this.namespace = io.of(/^.+$/);
    this.namespace.on('connection', client => {
      Promise.resolve(callback(client))
        .then((res: T) => {
          this.createCommunication(client, registries => registries[0])
          client.emit('success', res);
        })
        .catch(e => {
          client.emit('faild', Exception.isException(e) ? e.status : 500, e.message);
          client.disconnect();
        })
    });
  }

  public createCommunication(
    client: Socket, 
    strategy: TMicroServiceRequestProps['strategy']
  ) {
    const message = new Messager();
    const handler = message.createReceiver();
    message.setSender(data => client.emit('response', data));
    client.on('request', handler);
    this.createRequestMessage(message, strategy);
    this.createSubscribeMessage(message);
    this.createUnSubscribeMessage(message);
    client.on('disconnect', () => {
      for (const [key, { unsubscribe, stacks }] of this) {
        if (stacks.has(message)) {
          stacks.delete(message);
        }
        if (stacks.size === 0) {
          this.delete(key);
          unsubscribe();
        }
      }
    })
  }

  private createRequestMessage(message: Messager, strategy?: TMicroServiceRequestProps['strategy']) {
    message.on('request', (state: [string, string, any[]]) => this.micro.sendback({
      interface: state[0],
      method: state[1],
      arguments: state[2],
      strategy
    }))
  }

  private createSubscribeMessage(message: Messager) {
    message.on('subscribe', async (state: [string, string]) => {
      const [intername, method] = state;
      const key = intername + ':' + method;
      let init = false, obj: any;
      if (!this.has(key)) {
        const object = {
          unsubscribe: () => Promise.resolve(),
          stacks: new Set<Messager>(),
          value: null as any
        }
        this.set(key, object);
        init = true;
        obj = object;
      }
      const { stacks, value } = this.get(key);
      if (!stacks.has(message)) stacks.add(message);
      if (init) {
        const unsubscribe = await this.micro.subscribe(
          { interface: intername, method }, 
          res => this.boardCastClients(intername, method, res),
        );
        obj.unsubscribe = unsubscribe;
      } else {
        message.publish([intername, method, value]);
      }
    })
  }

  private createUnSubscribeMessage(message: Messager) {
    message.on('unsubscribe', async (state: [string, string]) => {
      const [intername, method] = state;
      const key = intername + ':' + method;
      if (this.has(key)) {
        const { unsubscribe, stacks } = this.get(key);
        if (stacks.has(message)) {
          stacks.delete(message);
        }
        if (stacks.size === 0) {
          await unsubscribe();
          this.delete(key);
        }
      }
    })
  }

  private boardCastClients<T>(intername: string, method: string, state: T) {
    const key = intername + ':' + method;
    if (this.has(key)) {
      const obj = this.get(key);
      obj.value = state;
      for (const client of obj.stacks.values()) {
        client.publish([intername, method, state]);
      }
    }
  }
}