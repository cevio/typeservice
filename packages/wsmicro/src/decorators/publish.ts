import { MethodMetaCreator } from '@typeservice/decorator';
export const PublishNameSpace = 'Publish';
export function Publish() {
  return MethodMetaCreator.define(PublishNameSpace, true);
}