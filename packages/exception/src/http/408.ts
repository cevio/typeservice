import { HttpException } from '../HttpException';

export class HttpRequestTimeoutException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Request Timeout');
    super(408, 'REQUEST_TIMEOUT', ...args);
  }
}