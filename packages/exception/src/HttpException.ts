import { Exception } from './Exception';

export class HttpException extends Exception {
  public readonly code: string;
  private readonly headers = new Map<string, string>();
  constructor(status: number, code: string, ...args: any[]) {
    super(status, ...args);
    this.code = code;
  }

  public set(key: string, value: string) {
    this.headers.set(key, value);
    return this;
  }

  public pipe(ctx: { set: (key: string, value: string) => void }) {
    for (const [key, value] of this.headers) {
      ctx.set(key, value);
    }
    return this;
  }
}