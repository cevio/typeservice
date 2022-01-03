import { Exception } from '@typeservice/exception';

export class RPCMethodNotFoundException extends Exception {
  constructor(...args: any[]) {
    super(1005, ...args);
  }
}