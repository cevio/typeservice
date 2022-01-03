import { Exception } from '@typeservice/exception';

export class RPCZookeeperOfflineException extends Exception {
  constructor(...args: any[]) {
    super(1106, ...args);
  }
}