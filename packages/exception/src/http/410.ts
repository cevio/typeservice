import { HttpException } from '../HttpException';

export class HttpGoneException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Gone');
    super(410, 'GONE', ...args);
  }
}