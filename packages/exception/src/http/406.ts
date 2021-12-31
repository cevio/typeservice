import { HttpException } from '../HttpException';

export class HttpNotAcceptableException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Not Acceptable');
    super(406, 'NOT_ACCEPTABLE', ...args);
  }
}