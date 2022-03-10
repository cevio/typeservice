import Koa, { Context, Next } from 'koa';
import * as Router from 'koa-router-find-my-way';
import { interfaces, Container } from 'inversify';
import { AnnotationMetaDataScan } from '@typeservice/decorator';
import { HttpBadRequestException, HttpException, HttpNotFoundException } from '@typeservice/exception';
import { transformMiddlewares } from './middleware';
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
    defaultRoute: () => {
      throw new HttpNotFoundException();
    },
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