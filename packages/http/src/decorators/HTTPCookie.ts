import * as Cookie from 'cookies';
import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export type TCookieResolve = {
  get: (key: string, opt?: Cookie.GetOption) => string;
  set: (key: string, value: string, opt?: Cookie.SetOption) => Cookie;
}

export function HTTPCookie(keys: string[] = ['cookie']) {
  return ParameterMetaCreator.define((ctx: Context) => {
    const cookies = new Cookie(ctx.req, ctx.res, { keys });
    return {
      get: (key: string, opt?: Cookie.GetOption) => cookies.get(key, opt),
      set: (key: string, value: string, opt?: Cookie.SetOption) => cookies.set(key, value, opt),
    } as TCookieResolve;
  })
}