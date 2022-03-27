import { MethodMetaCreator } from '@typeservice/decorator';
export const PublicNameSpace = 'Public';
export function Public() {
  return MethodMetaCreator.define(PublicNameSpace, true);
}