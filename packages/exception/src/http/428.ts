import { HttpException } from '../HttpException';

export class HttpPreconditionRequiredException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Precondition Required');
    super(428, 'PRECONDITION_REQUIRED', ...args);
  }
}