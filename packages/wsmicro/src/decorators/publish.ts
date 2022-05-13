import { MethodMetaCreator } from '@typeservice/decorator';
export const PublishNameSpace = 'Publish';
export function Publish<T = any>(fn?: (newValue: T, oldValue: T) => boolean) {
  return MethodMetaCreator.define(PublishNameSpace, fn || true);
}