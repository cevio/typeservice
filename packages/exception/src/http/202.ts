import { HttpException } from '../HttpException';

export class HttpAcceptedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Accepted');
    super(202, 'ACCEPTED', ...args);
  }
}