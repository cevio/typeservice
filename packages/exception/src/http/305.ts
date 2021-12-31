import { HttpException } from '../HttpException';

export class HttpUseProxyException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Use Proxy');
    super(305, 'USE_PROXY', ...args);
  }
}