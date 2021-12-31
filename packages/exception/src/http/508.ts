import { HttpException } from '../HttpException';

export class HttpLoopDetectedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Loop Detected');
    super(508, 'LOOP_DETECTED', ...args);
  }
}