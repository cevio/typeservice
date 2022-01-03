import { Exception } from '@typeservice/exception';

export class RPCArgumentsEmptyException extends Exception {
  constructor(...args: any[]) {
    super(1003, ...args);
  }
}