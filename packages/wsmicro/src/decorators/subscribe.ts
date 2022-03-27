import { MethodMetaCreator } from '@typeservice/decorator';
export const SubscribeNameSpace = 'Subscribe';
export function Subscribe(intername: string, method: string) {
  return MethodMetaCreator.define(SubscribeNameSpace, {
    interface: intername, method
  });
}