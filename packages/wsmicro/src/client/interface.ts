export interface TRetryConfigs {
  retries?: number,
  factor?: number,
  minTimeout?: number,
  maxTimeout?: number,
  randomize?: boolean,
}

export interface TClientStackState<T> {
  data: T,
  backable?: boolean,
  timeout?: number,
  type: 1 | 2 | 3,
  resolve: (value?: any) => void,
  reject: (reason?: any) => void,
}