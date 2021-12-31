import { HttpException } from '../HttpException';

export class HttpCreatedException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Created');
    super(201, 'CREATED', ...args);
  }
}