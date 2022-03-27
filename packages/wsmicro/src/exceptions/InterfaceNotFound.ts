import { Exception } from '@typeservice/exception';

export class InterfaceNotFoundException extends Exception {
  constructor(...args: any[]) {
    super(1004, ...args);
  }
}