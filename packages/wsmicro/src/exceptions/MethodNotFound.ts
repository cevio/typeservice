import { Exception } from '@typeservice/exception';

export class MethodNotFoundException extends Exception {
  constructor(...args: any[]) {
    super(1005, ...args);
  }
}