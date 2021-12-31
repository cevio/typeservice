import { HttpException } from '../HttpException';

export class HttpRequestHeaderFieldsTooLargeException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Request Header Fields Too Large');
    super(431, 'REQUEST_HEADER_FIELDS_TOO_LARGE', ...args);
  }
}