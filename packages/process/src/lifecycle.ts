export type EffectInput<T> = (schema?: T) => void | EffectOutput | Promise<void> | Promise<EffectOutput>;
export type EffectOutput = () => void | Promise<void>;

export class LifeCycle<T> {
  private readonly stacks: EffectInput<T>[] = [];
  private cancels: EffectOutput[] = [];

  public createServer(fn: EffectInput<T>) {
    this.stacks.push(fn);
    return this;
  }

  public async commit(schema: T) {
    for (let i = 0 ; i < this.stacks.length; i++) {
      const stack = this.stacks[i];
      const output = await Promise.resolve(stack(schema));
      if (typeof output === 'function') {
        this.cancels.push(output);
      }
    }
  }

  public async rollback() {
    let i = this.cancels.length;
    while (i--) await Promise.resolve(this.cancels[i]());
  }
}