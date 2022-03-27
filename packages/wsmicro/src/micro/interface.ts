import { UrlWithParsedQuery } from 'url';
import { Container, interfaces } from "inversify";
import { TRetryConfigs } from '../client';

export interface TRegistry {
  mountProvider(namespace: string, port: number,query: {
    methods: string[],
    subscribes: string[],
    publishes: string[],
  }, extras?: Record<string, string | number | boolean>): Promise<void>,
  // 讲将所有已挂载的全部删除
  unmountAll(): Promise<void>,
  findInterface(intername: string, watch?: (uris: UrlWithParsedQuery[]) => void): Promise<UrlWithParsedQuery[]>,
}

export interface TMicroServiceConfigs {
  container?: Container,
  registry: TRegistry,
  services?: interfaces.Newable<any>[],
  heartbeat?: number,
  retry?: TRetryConfigs
}

export interface TMicroServiceRequestProps<T = any> {
  interface: string,
  method: string,
  arguments: T[],
  timeout?: number,
  strategy?: (uris: UrlWithParsedQuery[]) => UrlWithParsedQuery,
}

export type TMicroServiceNamespaceStackProps = Omit<TMicroServiceRequestProps, 'interface' | 'arguments' | 'timeout'> & { 
  type: 'methods' | 'publishes' | 'subscribes',
  resolve: Function,
}