import { interfaces } from 'inversify';
export interface TServiceState<T> {
  ref: interfaces.Newable<T>,
  methods: string[],
  publishes: string[],
  subscribes: string[],
}

export interface TCommunication {
  interface: string,
  method: string,
  arguments: any[],
}