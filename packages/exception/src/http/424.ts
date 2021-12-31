import { HttpException } from '../HttpException';

export class HttpFailedDependencyException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Failed Dependency');
    super(424, 'FAILED_DEPENDENCY', ...args);
  }
}