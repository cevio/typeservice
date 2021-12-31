import { HttpException } from '../HttpException';

export class HttpOKException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('OK');
    super(200, 'OK', ...args);
  }
}