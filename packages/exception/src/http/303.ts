import { HttpException } from '../HttpException';

export class HttpSeeOtherException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('See Other');
    super(303, 'SEE_OTHER', ...args);
  }
}