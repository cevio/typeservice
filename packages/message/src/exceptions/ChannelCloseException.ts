import { Exception } from '@typeservice/exception';

export class MessageChannelCloseException extends Exception {
  constructor(...args: any[]) {
    super(1202, ...args);
  }
}