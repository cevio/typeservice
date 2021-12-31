import { HttpException } from '../HttpException';

export class HttpExpectationFailedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Expectation Failed');
    super(417, 'EXPECTATION_FAILED', ...args);
  }
}