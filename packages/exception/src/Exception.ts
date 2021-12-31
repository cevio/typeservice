export class Exception extends Error {

  [key: string]: any;

  static isException(e: any) {
    return e instanceof Exception && Array.isArray(e.messages);
  }

  public readonly messages: any[];
  public readonly status: number;

  constructor(status: number, ...args: any[]) {
    super(each(args));
    this.messages = args;
    this.status = status || 500;
  }
}

function format(e: any) {
  switch (typeof e) {
    case 'bigint':
    case 'number': return e + '';
    case 'boolean': return e ? 'true' : 'false';
    case 'undefined': return 'undefined';
    case 'symbol': return 'Symbol()';
    case 'string': return e;
    default: return JSON.stringify(e);
  }
}

function each(e: any[], sep: string = ' ') {
  return e.map(k => format(k)).join(sep);
}