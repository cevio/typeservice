import { HttpException } from '../HttpException';

export class HttpPaymentRequiredException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Payment Required');
    super(402, 'PAYMENT_REQUIRED', ...args);
  }
}