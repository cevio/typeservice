import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestQuery(key?: string) {
  return ParameterMetaCreator.define((ctx: Context) => {
    if (key) return ctx.query[key];
    return ctx.query;
  })
}