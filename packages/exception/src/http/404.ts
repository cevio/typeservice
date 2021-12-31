import { HttpException } from '../HttpException';

export class HttpNotFoundException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Not Found');
    super(404, 'NOT_FOUND', ...args);
  }
}