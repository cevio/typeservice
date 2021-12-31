import { HttpException } from '../HttpException';

export class HttpVariantAlsoNegotiatesException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Variant Also Negotiates');
    super(506, 'VARIANT_ALSO_NEGOTIATES', ...args);
  }
}