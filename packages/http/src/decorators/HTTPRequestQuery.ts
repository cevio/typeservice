import { ParameterMetaCreator } from '@typeservice/decorator';
import { Context } from 'koa';

export function HTTPRequestQuery(key?: string, ...formats: Function[]) {
  return ParameterMetaCreator.define(async (ctx: Context) => {
    if (typeof key === 'string') {
      const value = ctx.query[key];
      if (!formats.length) return value;
      let _value: any = value;
      for (let i = 0; i < formats.length; i++) {
        _value = await Promise.resolve(formats[i](_value));
      }
      return _value;
    }
    return ctx.query;
  })
}