import { ClassMetaCreator } from '@typeservice/decorator';
import { THTTPMiddleware, THTTPCommonMiddlewareMetaState, buildMiddleware } from '../middleware';

export type THTTPControllerMiddlewareMetaState = THTTPCommonMiddlewareMetaState;

export function HTTPControllerMiddleware(middleware: THTTPMiddleware) {
  return ClassMetaCreator.unshift(HTTPControllerMiddleware.namespace, buildMiddleware(middleware));
}

HTTPControllerMiddleware.namespace = 'HTTP:CONTROLLER:MIDDLEWARE';