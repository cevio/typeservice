import { HttpException } from '../HttpException';

export class HttpUnsupportedMediaTypeException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Unsupported Media Type');
    super(415, 'UNSUPPORTED_MEDIA_TYPE', ...args);
  }
}