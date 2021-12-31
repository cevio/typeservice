import { HttpException } from '../HttpException';

export class HttpPreconditionFailedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Precondition Failed');
    super(412, 'PRECONDITION_FAILED', ...args);
  }
}