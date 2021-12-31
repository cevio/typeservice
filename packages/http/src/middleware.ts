import { AnnotationDependenciesAutoRegister, ClassMetaCreator } from '@typeservice/decorator';
import { HttpInternalServerException } from '@typeservice/exception';
import { injectable, Container, interfaces } from 'inversify';
import { Middleware } from 'koa';

export type THTTPMiddlewareMetaState = boolean;
export type THTTPMiddleware = HTTPMiddlewareImplements | Middleware | interfaces.Newable<any>;
export type THTTPCommonMiddlewareMetaState = { transform: boolean, value: Middleware | ((container: Container) => Middleware) }[];

export abstract class HTTPMiddlewareImplements {
  public readonly use: Middleware;
}

export function HTTPMiddleware() {
  return ClassMetaCreator.join(
    ClassMetaCreator.define(HTTPMiddleware.namespace, true),
    injectable() as ClassDecorator
  );
}

export function isHTTPMiddleware(obj: any) {
  if (!obj.prototype) return 0;
  if (typeof obj.prototype.use !== 'function') return 0;
  if (obj.prototype.use.length !== 2) return 0;
  const instance = ClassMetaCreator.instance(obj);
  if (!instance.got(HTTPMiddleware.namespace, false)) return -1;
  return 1;
}

export function transformMiddlewares(state: THTTPCommonMiddlewareMetaState, container: Container): Middleware[] {
  return state.map(({ transform, value }) => {
    if (transform) return ((value as (container: Container) => Middleware)(container)) as Middleware;
    return value as Middleware;
  })
}

export function buildMiddleware(middleware: THTTPMiddleware) {
  const result = isHTTPMiddleware(middleware);
  if (result === 0) return { 
    transform: false, 
    value: middleware 
  }
  if (result === -1) {
    const name = (middleware as interfaces.Newable<any>).name;
    throw new HttpInternalServerException(`miss decorator '@HTTPMiddleware' on Middleware<${name}>`);
  }
  return {
    transform: true,
    value: (container: Container) => {
      AnnotationDependenciesAutoRegister(middleware as interfaces.Newable<any>, container);
      const target = container.get<HTTPMiddlewareImplements>(middleware as any);
      return target.use.bind(target);
    }
  }
}

HTTPMiddleware.namespace = Symbol('HTTP:MIDDLEWARE');