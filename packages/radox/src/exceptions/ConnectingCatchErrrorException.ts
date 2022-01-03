import { Exception } from '@typeservice/exception';

export class RPCConnectingCatchErrorException extends Exception {
  constructor(...args: any[]) {
    super(1001, ...args);
  }
}