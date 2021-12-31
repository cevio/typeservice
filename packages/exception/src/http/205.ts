import { HttpException } from '../HttpException';

export class HttpResetContentException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Reset Content');
    super(205, 'RESET_CONTENT', ...args);
  }
}