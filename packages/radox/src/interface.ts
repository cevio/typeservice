import { interfaces } from "inversify";

export interface RadoxProps {
  zookeeper: string,
  port: number,
  balance?: 'rdm' | 'hit' | string,
  logger?: any
}

export interface TNameSpace {
  target: interfaces.Newable<any>, 
  methods: string[], 
  path: string,
}

export interface TSendProps {
  command: string,
  method: string,
  arguments: any[],
  balance?: RadoxProps['balance'],
  timeout?: number,
}