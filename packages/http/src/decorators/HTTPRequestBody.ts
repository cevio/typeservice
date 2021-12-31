import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestBody() {
  return ParameterMetaCreator.define((ctx: Context) => {
    // @ts-ignore
    return ctx.request.body;
  })
}