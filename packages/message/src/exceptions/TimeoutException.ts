import { Exception } from '@typeservice/exception';

export class MessageTimeoutException extends Exception {
  constructor(...args: any[]) {
    super(1208, ...args);
  }
}