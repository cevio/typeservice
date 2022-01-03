import { Exception } from '@typeservice/exception';

export class RPCInterfaceNotFoundException extends Exception {
  constructor(...args: any[]) {
    super(1004, ...args);
  }
}