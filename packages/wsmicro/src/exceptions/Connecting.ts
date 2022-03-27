import { Exception } from '@typeservice/exception';

export class ConnectingException extends Exception {
  constructor(...args: any[]) {
    super(1001, ...args);
  }
}