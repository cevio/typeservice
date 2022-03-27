import { Exception } from '@typeservice/exception';

export class ZookeeperOfflineException extends Exception {
  constructor(...args: any[]) {
    super(1107, ...args);
  }
}