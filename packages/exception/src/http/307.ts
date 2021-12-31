import { HttpException } from '../HttpException';

export class HttpTemporaryRedirectException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Temporary Redirect');
    super(307, 'TEMPORARY_REDIRECT', ...args);
  }
}