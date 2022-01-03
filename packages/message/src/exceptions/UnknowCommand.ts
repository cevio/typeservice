import { Exception } from '@typeservice/exception';

export class MessageUnknowCommandException extends Exception {
  constructor(...args: any[]) {
    super(1304, ...args);
  }
}