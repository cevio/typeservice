import { MethodMetaCreator } from '@typeservice/decorator';
export const PublicNameSpace = Symbol('Public');
export function Public() {
  return MethodMetaCreator.define(PublicNameSpace, true);
}