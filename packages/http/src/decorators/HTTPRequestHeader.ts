import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestHeader(key?: string) {
  return ParameterMetaCreator.define((ctx: Context) => {
    if (key) return ctx.header[key];
    return ctx.header;
  })
}