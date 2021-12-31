import { HttpException } from '../HttpException';

export class HttpMovedPermanentlyException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Moved Permanently');
    super(301, 'MOVED_PERMANENTLY', ...args);
  }
}