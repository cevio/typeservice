import { HttpException } from '../HttpException';

export class HttpMultipleChoicesException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Multiple Choices');
    super(300, 'MULTIPLE_CHOICES', ...args);
  }
}