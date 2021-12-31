import { HttpException } from '../HttpException';

export class HttpImATeapotException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('I\'m a teapot');
    super(418, 'IMA_TEAPOT', ...args);
  }
}