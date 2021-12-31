import { HttpException } from '../HttpException';

export class HttpFoundException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Found');
    super(302, 'FOUND', ...args);
  }
}