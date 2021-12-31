import { HttpException } from '../HttpException';

export class HttpNoContentException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('No Content');
    super(204, 'NO_CONTENT', ...args);
  }
}