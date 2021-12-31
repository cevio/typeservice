import { HttpException } from '../HttpException';

export class HttpBandwidthLimitExceededException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Bandwidth Limit Exceeded');
    super(509, 'BANDWIDTH_LIMIT_EXCEEDED', ...args);
  }
}