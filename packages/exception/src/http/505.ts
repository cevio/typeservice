import { HttpException } from '../HttpException';

export class HttpVersionNotSupportedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('HTTP Version Not Supported');
    super(505, 'HTTP_VERSION_NOT_SUPPORTED', ...args);
  }
}