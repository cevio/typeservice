import { HttpException } from '../HttpException';

export class HttpUnprocessableEntityException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Unprocessable Entity');
    super(422, 'UNPROCESSABLE_ENTITY', ...args);
  }
}