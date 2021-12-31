import { HttpException } from '../HttpException';

export class HttpMisdirectedRequestException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Misdirected Request');
    super(421, 'MISDIRECTED_REQUEST', ...args);
  }
}