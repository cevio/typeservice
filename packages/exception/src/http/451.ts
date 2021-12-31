import { HttpException } from '../HttpException';

export class HttpUnavailableForLegalReasonsException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Unavailable For Legal Reasons');
    super(451, 'UNAVAILABLE_FOR_LEGAL_REASONS', ...args);
  }
}