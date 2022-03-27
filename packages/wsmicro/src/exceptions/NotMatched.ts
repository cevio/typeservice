import { Exception } from '@typeservice/exception';

export class RegistryNotMatchedException extends Exception {
  constructor(...args: any[]) {
    super(1006, ...args);
  }
}