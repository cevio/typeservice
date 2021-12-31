import { HttpException } from '../HttpException';

export class HttpServiceUnavailableException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Service Unavailable');
    super(503, 'SERVICE_UNAVAILABLE', ...args);
  }
}