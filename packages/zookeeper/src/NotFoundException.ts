import { Exception } from '@typeservice/exception';

export class ZookeeperPathNotFoundException extends Exception {
  constructor(...args: any[]) {
    super(1108, ...args);
  }
}