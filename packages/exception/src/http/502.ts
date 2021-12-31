import { HttpException } from '../HttpException';

export class HttpBadGatewayException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Bad Gateway');
    super(502, 'BAD_GATEWAY', ...args);
  }
}