import { HttpException } from '../HttpException';

export class HttpProxyAuthenticationRequiredException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Proxy Authentication Required');
    super(407, 'PROXY_AUTHENTICATION_REQUIRED', ...args);
  }
}