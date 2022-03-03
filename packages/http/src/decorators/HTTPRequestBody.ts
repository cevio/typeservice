import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestBody() {
  return ParameterMetaCreator.define((ctx: Context) => ctx.request.body)
}