import { HttpException } from '../HttpException';

export class HttpNetworkAuthenticationRequiredException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Network Authentication Required');
    super(511, 'NETWORK_AUTHENTICATION_REQUIRED', ...args);
  }
}