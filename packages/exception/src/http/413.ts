import { HttpException } from '../HttpException';

export class HttpPayloadTooLargeException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Payload Too Large');
    super(413, 'PAYLOAD_TOO_LARGE', ...args);
  }
}