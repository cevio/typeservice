import { HttpException } from '../HttpException';

export class HttpNotImplementedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Not Implemented');
    super(501, 'NOT_IMPLEMENTED', ...args);
  }
}