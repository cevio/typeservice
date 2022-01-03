import { Exception } from '@typeservice/exception';

export class RPCAgentNotFoundException extends Exception {
  constructor(...args: any[]) {
    super(1104, ...args);
  }
}