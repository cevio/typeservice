import { HttpException } from '../HttpException';

export class HttpTooManyRequestsException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Too Many Requests');
    super(429, 'TOO_MANY_REQUESTS', ...args);
  }
}