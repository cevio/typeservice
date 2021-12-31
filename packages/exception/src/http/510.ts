import { HttpException } from '../HttpException';

export class HttpNotExtendedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Not Extended');
    super(510, 'NOT_EXTENDED', ...args);
  }
}