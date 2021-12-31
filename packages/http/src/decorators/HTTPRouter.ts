import { HTTPMethod } from "find-my-way";
import { MethodMetaCreator } from '@typeservice/decorator';

export interface THTTPRouterMetaState {
  readonly pathname: string,
  readonly methods: HTTPMethod | HTTPMethod[],
  readonly status?: 200 | 201 | 202 | 203 | 204 | 205 | 206,
}

export function HTTPRouter(options: THTTPRouterMetaState) {
  return MethodMetaCreator.define(HTTPRouter.namespace, options);
}

HTTPRouter.namespace = Symbol('HTTP:ROUTER');