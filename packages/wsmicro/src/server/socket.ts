import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { Messager } from '@typeservice/message';
import { Server } from '.';
export class Socket extends EventEmitter {
  private readonly message = new Messager();
  private readonly timer: NodeJS.Timer;
  private checking = false;
  constructor(
    private readonly server: Server,
    private readonly connection: WebSocket, 
    public readonly request: IncomingMessage,
  ) {
    super();
    this.setMaxListeners(+Infinity);
    const handler = this.message.createReceiver();
    this.connection.on('message', handler);
    this.message.setSender(data => this.connection.send(JSON.stringify(data)));
    this.message.on('request', (data: [string, string, any[]]) => this.server.execute(data[0], data[1], data[2]));
    this.message.on('subscribe', (data: [string, string]) => this.server.subscribe(data[0], data[1], this));
    this.message.on('unsubscribe', (data: [string, string]) => this.server.unsubscribe(data[0], data[1], this));
    this.connection.on('close', () => {
      this.connection.off('message', handler);
      clearInterval(this.timer);
      this.message.disable();
      this.emit('close');
    })
    this.timer = setInterval(() => {
      if (this.checking) return;
      const now = Date.now();
      const heatbeat = this.server.heartbeat;
      if (now - this.message.last_read_time > heatbeat || now - this.message.last_write_time > heatbeat) {
        const resolve = () => {
          this.connection.off('pong', resolve);
          clearTimeout(timer);
          this.checking = false;
          this.message.last_read_time = Date.now();
        }
        this.checking = true;
        this.connection.on('pong', resolve)
        this.connection.ping();
        this.message.last_write_time = Date.now();
        const timer = setTimeout(() => this.connection.terminate(), heatbeat * 3);
      }
    }, 1000);
  }

  public close() {
    this.message.disable();
    this.connection.close();
  }

  public publish<T = any>(intername: string, method: string, state: T) {
    return this.message.publish([intername, method, state]);
  }
}