import { HttpException } from '../HttpException';

export class HttpRangeNotSatisfiableException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Range Not Satisfiable');
    super(416, 'RANGE_NOT_SATISFIABLE', ...args);
  }
}