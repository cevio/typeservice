import { EventEmitter } from 'events';
import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Messager } from '@typeservice/message';

export class WebSocket extends EventEmitter {
  private readonly socket: Socket;
  private readonly message = new Messager();
  private readonly stacks = new Map<string, Set<(r: any) => void>>();
  constructor(query?: Record<string, any>) {
    super();
    this.setMaxListeners(+Infinity);
    this.socket = io({ withCredentials: true, query });
    this.socket.on('faild', (...args) => this.emit('faild', ...args));
    this.socket.on('success', (...args: any[]) => {
      const handler = this.message.createReceiver();
      this.message.setSender(data => this.socket.emit('request', data));
      this.socket.on('response', handler);
      this.message.on('publish', (state: [string, string, any]) => {
        const [intername, method, res] = state;
        const key = intername + ':' + method;
        if (this.stacks.has(key)) {
          const callbacks = this.stacks.get(key);
          for (const callback of callbacks) {
            callback(res);
          }
        }
      })
      this.emit('bootstrap', ...args);
    });
  }

  public async sendback<T = unknown>(options: {
    interface: string, 
    method: string, 
    arguments: any[],
  }, timeout?: number) {
    const res = await this.message.sendback([options.interface, options.method, options.arguments], timeout);
    return res as T;
  }

  public subscribe(options: {
    interface: string, 
    method: string,
  }, callback: (r: any) => void) {
    const key = options.interface + ':' + options.method;
    if (!this.stacks.has(key)) this.stacks.set(key, new Set());
    const chunks = this.stacks.get(key);
    if (!chunks.has(callback)) {
      chunks.add(callback);
    }
    const rollback = () => {
      if (this.stacks.has(key)) {
        const chunks = this.stacks.get(key);
        if (chunks.has(callback)) {
          chunks.delete(callback);
        }
        if (!chunks.size) {
          this.stacks.delete(key);
          this.unsubscribe(options);
        }
      }
    }
    return this.message.subscribe([options.interface, options.method]).then(() => rollback).catch(e => {
      rollback();
      return Promise.reject(e);
    });
  }

  public unsubscribe(options: {
    interface: string, 
    method: string,
  }) {
    return this.message.unsubscribe([options.interface, options.method]);
  }

  public useSubscribe<T>(
    intername: string, method: string, 
    callback: (r: T) => void, 
    deps: any[] = [],
  ) {
    const [error, setError] = useState(null);
    const fn = useCallback(callback, deps);
    useEffect(() => {
      let rollback: () => void;
      this.subscribe({
        interface: intername,
        method
      }, fn).then((roll) => rollback = roll).catch(setError);
      return () => {
        if (rollback) return rollback();
      }
    }, [intername, method, fn]);
    return error;
  }
}