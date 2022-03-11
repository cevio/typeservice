import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';
import { getClientIp } from 'request-ip';

export function HTTPRequestIP() {
  return ParameterMetaCreator.define((ctx: Context) => getClientIp(ctx.req));
}