import { MethodMetaCreator } from '@typeservice/decorator';
import { THTTPCommonMiddlewareMetaState, THTTPMiddleware, buildMiddleware } from '../middleware';

export type THTTPRouterMiddlewareMetaState = THTTPCommonMiddlewareMetaState;

export function HTTPRouterMiddleware(middleware: THTTPMiddleware) {
  return MethodMetaCreator.unshift(HTTPRouterMiddleware.namespace, buildMiddleware(middleware));
}

HTTPRouterMiddleware.namespace = 'HTTP:ROUTER:MIDDLEWARE';