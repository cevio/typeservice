import { HttpException } from '../HttpException';

export class HttpInternalServerException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Internal Server Error');
    super(500, 'INTERNAL_SERVER_ERROR', ...args);
  }
}