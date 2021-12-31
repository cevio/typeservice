import { HttpException } from '../HttpException';

export class HttpMethodNotAllowedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Method Not Allowed');
    super(405, 'METHOD_NOT_ALLOWED', ...args);
  }
}