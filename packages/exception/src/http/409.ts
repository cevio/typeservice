import { HttpException } from '../HttpException';

export class HttpConflictException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Conflict');
    super(409, 'CONFLICT', ...args);
  }
}