import { HttpException } from '../HttpException';

export class HttpNonAuthoritativeInformationException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Non-Authoritative Information');
    super(203, 'NON-AUTHORITATIVE_INFORMATION', ...args);
  }
}