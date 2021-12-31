import { HttpException } from '../HttpException';

export class HttpUnorderedCollectionException extends HttpException {
  constructor(...args: any[]) {
    if (!args.length) args.push('Unordered Collection');
    super(425, 'UNORDERED_COLLECTION', ...args);
  }
}