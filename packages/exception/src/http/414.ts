import { HttpException } from '../HttpException';

export class HttpURITooLongException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('URI Too Long');
    super(414, 'URI_TOO_LONG', ...args);
  }
}