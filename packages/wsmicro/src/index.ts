import { Container, interfaces } from 'inversify';
import { MicroService, TRegistry } from './micro';
import { TRetryConfigs } from './client';
import { createContext } from '@typeservice/process';

export * from './server';
export * from './client';
export * from './decorators';
export * from './exceptions';
export * from './micro';

export type TRegistryGetter = () => TRegistry | Promise<TRegistry>;
export type TPortGetter = () => number | Promise<number>;

export interface TCreateWSMicroServerProps {
  container?: Container,
  registry: TRegistry | TRegistryGetter,
  services?: interfaces.Newable<any>[],
  heartbeat?: number,
  retry?: TRetryConfigs,
  port: number | TPortGetter,
  bootstrap?: (port: number) => any | Promise<any>,
  destroyed?: (port: number) => any | Promise<any>,
}

export const CONTEXT_WS_MICROSERVER = createContext<MicroService>(undefined);

export function createWSMricoServer(configs: TCreateWSMicroServerProps) {
  return async () => {
    const port = typeof configs.port === 'function'
      ? await Promise.resolve((configs.port as TPortGetter)())
      : configs.port;
    const microService = new MicroService({
      container: configs.container,
      registry: typeof configs.registry === 'function' 
        ? await Promise.resolve((configs.registry as TRegistryGetter)()) 
        : configs.registry,
      services: configs.services,
      heartbeat: configs.heartbeat,
      retry: configs.retry,
    });
    await microService.listen(port);
    CONTEXT_WS_MICROSERVER.setContext(microService);
    if (configs.bootstrap) await Promise.resolve(configs.bootstrap(port));
    return async () => {
      await microService.close();
      CONTEXT_WS_MICROSERVER.setContext(undefined);
      if (configs.destroyed) await Promise.resolve(configs.destroyed(port));
    }
  }
  
}