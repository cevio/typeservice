import { HttpException } from '../HttpException';

export class HttpLengthRequiredException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Length Required');
    super(411, 'LENGTH_REQUIRED', ...args);
  }
}