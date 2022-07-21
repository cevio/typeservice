import { createServer, Server } from 'http';
import Koa, { Context, Next, Middleware } from 'koa';
import * as Router from 'koa-router-find-my-way';
import { interfaces, Container } from 'inversify';
import { AnnotationMetaDataScan } from '@typeservice/decorator';
import { HttpBadRequestException, HttpException, HttpNotFoundException } from '@typeservice/exception';
import { transformMiddlewares } from './middleware';
import { createContext } from '@typeservice/process';
import { 
  HTTPController, 
  HTTPRouter, 
  HTTPControllerMiddleware,
  HTTPRouterMiddleware,
  THTTPControllerMetaState, 
  THTTPRouterMetaState, 
  THTTPControllerMiddlewareMetaState,
  THTTPRouterMiddlewareMetaState,
} from './decorators';

export * from './decorators';
export * from './middleware';
export * from 'inversify';

export class HTTP extends Koa {
  private readonly router = Router({
    maxParamLength: Infinity,
    caseSensitive: true,
    ignoreTrailingSlash: true,
    allowUnsafeRegex: true,
    // @ts-ignore
    defaultRoute: async (ctx: Context, next: Next) => await next(),
    onBadUrl: () => {
      throw new HttpBadRequestException();
    }
  });

  constructor(private readonly container: Container) {
    super();
  }

  public routes() {
    return this.router.routes();
  }

  public addController(...args: Parameters<Router.Instance['on']>) {
    return this.router.on(...args);
  }
  
  public removeController(...args: Parameters<Router.Instance['off']>) {
    return this.router.off(...args);
  }

  public createService<T>(clazz: interfaces.Newable<T>) {
    const source = AnnotationMetaDataScan(clazz, this.container);
    if (!source.meta.got<THTTPControllerMetaState>(HTTPController.namespace)) return;
    const controllerMiddlewares = source.meta.got<THTTPControllerMiddlewareMetaState>(HTTPControllerMiddleware.namespace, []);
    const target = this.container.get(clazz);
    const destroyCallbacks: (() => void)[] = [];
    Array.from(source.methods.entries()).forEach(([key, meta]) => {
      const routerMeta = meta.meta.got<THTTPRouterMetaState>(HTTPRouter.namespace);
      if (!routerMeta) return;
      const routerMiddlewares = meta.meta.got<THTTPRouterMiddlewareMetaState>(HTTPRouterMiddleware.namespace, []);
      const createController = async (ctx: Context, next: Next) => {
        try {
          const params = await meta.parameter.exec(ctx);
          ctx.body = await Promise.resolve((target[key as keyof typeof clazz] as Function)(...params));
          ctx.status = routerMeta.status || 200;
        } catch(e) {
          if (e instanceof HttpException) {
            if (e.status === 100) return await next();
            if ([301, 302, 307].includes(e.status)) {
              e.pipe(ctx);
              ctx.status = e.status;
              return ctx.redirect(e.messages[0]);
            }
            if ([200, 201, 202, 203, 204, 205, 206].includes(e.status)) {
              ctx.status = e.status;
              ctx.body = e.messages[0];
              return e.pipe(ctx);
            }
          }
          throw e;
        }
      }
      this.addController(
        routerMeta.methods, 
        routerMeta.pathname, 
        ...transformMiddlewares(
          controllerMiddlewares
            .concat(routerMiddlewares)
            .concat([{ transform: false, value: createController }]), 
          this.container
        )
      );
      destroyCallbacks.push(() => this.removeController(routerMeta.methods, routerMeta.pathname));
    });
    return () => destroyCallbacks.forEach(callback => callback());
  }
}

export const CONTEXT_HTTP_APPLICATION = createContext<HTTP>(undefined);
export const CONTEXT_HTTP_SERVER = createContext<Server>(undefined);
export type TPortGetter = () => number | Promise<number>;
export interface TCreateHTTPServerProps {
  container: Container,
  port: number | TPortGetter,
  services: interfaces.Newable<any>[],
  middlewares?: Middleware[],
  timeout?: number,
  onCreated?: (server: Server) => any | Promise<any>,
  bootstrap?: (port: number) => any | Promise<any>,
  destroyed?: (port: number) => any | Promise<any>,
}

export function createHTTPServer(configs: TCreateHTTPServerProps) {
  return async () => {
    const http = new HTTP(configs.container);
    if (configs.middlewares && configs.middlewares.length) {
      configs.middlewares.forEach(middleware => http.use(middleware));
    }
    http.use(http.routes())
    const server = createServer(http.callback());
    CONTEXT_HTTP_SERVER.setContext(server);
    if (configs.timeout !== undefined) {
      server.setTimeout(configs.timeout);
    }
    if (configs.services && configs.services.length) {
      configs.services.forEach(service => http.createService(service));
    }
    if (configs.onCreated) await Promise.resolve(configs.onCreated(server));
    const port = typeof configs.port === 'function'
      ? await Promise.resolve((configs.port as TPortGetter)())
      : configs.port;
    await new Promise<void>((resolve, reject) => {
      server.listen(port, (err?: any) => {
        if (err) return reject(err);
        resolve();
      })
    })
    CONTEXT_HTTP_APPLICATION.setContext(http);
    if (configs.bootstrap) await Promise.resolve(configs.bootstrap(port));
    return async () => {
      server.close();
      CONTEXT_HTTP_APPLICATION.setContext(undefined);
      CONTEXT_HTTP_SERVER.setContext(undefined);
      if (configs.destroyed) await Promise.resolve(configs.destroyed(port));
    }
  }
}