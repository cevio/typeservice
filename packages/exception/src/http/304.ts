import { HttpException } from '../HttpException';

export class HttpNotModifiedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Not Modified');
    super(304, 'NOT_MODIFIED', ...args);
  }
}