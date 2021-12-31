import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestParam(key?: string) {
  return ParameterMetaCreator.define((ctx: Context) => {
    if (key) return ctx.params[key];
    return ctx.params;
  })
}