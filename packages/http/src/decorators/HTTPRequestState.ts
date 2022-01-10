import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestState(key?: string) {
  return ParameterMetaCreator.define((ctx: Context) => {
    if (key) return ctx.state[key];
    return ctx.state;
  })
}