import { HttpException } from '../HttpException';

export class HttpLockedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Locked');
    super(423, 'LOCKED', ...args);
  }
}