import { Socket } from 'socket.io';
import { Messager } from '@typeservice/message';
import { MicroService, TCommunication, TMicroServiceRequestProps } from '@typeservice/wsmicro';

export class WebSocket extends Map<string, { unsubscribe: () => Promise<void>, stacks: Set<Messager> }> {
  constructor(private readonly micro: MicroService) {
    super();
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
    message.on('request', (state: TCommunication) => this.micro.sendback({
      interface: state.interface,
      method: state.method,
      arguments: state.arguments,
      strategy
    }))
  }

  private createSubscribeMessage(message: Messager) {
    message.on('subscribe', async (intername: string, method: string) => {
      const key = intername + ':' + method;
      if (!this.has(key)) {
        const object = {
          unsubscribe: () => Promise.resolve(),
          stacks: new Set<Messager>()
        }
        this.set(key, object);
        const unsubscribe = await this.micro.subscribe(
          { interface: intername, method }, 
          res => this.boardCastClients(intername, method, res)
        );
        object.unsubscribe = unsubscribe;
      }
      const { stacks } = this.get(key);
      if (!stacks.has(message)) stacks.add(message);
    })
  }

  private createUnSubscribeMessage(message: Messager) {
    message.on('unsubscribe', async (intername: string, method: string) => {
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
      const { stacks } = this.get(key);
      for (const client of stacks.values()) {
        client.publish(intername, method, state);
      }
    }
  }
}