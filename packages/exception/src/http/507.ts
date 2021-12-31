import { HttpException } from '../HttpException';

export class HttpInsufficientStorageException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Insufficient Storage');
    super(507, 'INSUFFICIENT_STORAGE', ...args);
  }
}