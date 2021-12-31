import { HttpException } from '../HttpException';

export class HttpSwitchingProtocolsException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Switching Protocols');
    super(101, 'SWITCHING_PROTOCOLS', ...args);
  }
}