import * as Cookie from 'cookies';
import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export type TCookie = Cookie;

export function HTTPCookie() {
  return ParameterMetaCreator.define((ctx: Context) => ctx.cookies);
}