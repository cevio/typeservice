import { HttpException } from '../HttpException';

export class HttpUpgradeRequiredException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Upgrade Required');
    super(426, 'UPGRADE_REQUIRED', ...args);
  }
}