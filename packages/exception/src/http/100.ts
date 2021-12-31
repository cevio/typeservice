import { HttpException } from '../HttpException';

export class HttpContinueException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Continue');
    super(100, 'CONTINUE', ...args);
  }
}