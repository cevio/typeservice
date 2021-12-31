import { HttpException } from '../HttpException';

export class HttpGatewayTimeoutException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Gateway Timeout');
    super(504, 'GATEWAY_TIMEOUT', ...args);
  }
}