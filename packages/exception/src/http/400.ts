import { HttpException } from '../HttpException';

export class HttpBadRequestException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Bad Request');
    super(400, 'BAD_REQUEST', ...args);
  }
}