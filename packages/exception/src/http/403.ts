import { HttpException } from '../HttpException';

export class HttpForbiddenException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Forbidden');
    super(403, 'FORBIDDEN', ...args);
  }
}