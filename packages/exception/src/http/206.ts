import { HttpException } from '../HttpException';

export class HttpPartialContentException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Partial Content');
    super(206, 'PARTIAL_CONTENT', ...args);
  }
}