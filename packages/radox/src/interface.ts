import { interfaces, Container } from "inversify";

export interface RadoxProps {
  zookeeper: string,
  port: number,
  balance?: 'rdm' | 'hit' | string,
  logger?: any,
  container: Container,
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