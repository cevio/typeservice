import { HttpException } from '../HttpException';

export class HttpUnauthorizedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Unauthorized');
    super(401, 'UNAUTHORIZED', ...args);
  }
}