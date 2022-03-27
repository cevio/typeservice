import { ClassMetaCreator } from '@typeservice/decorator';
import { injectable } from 'inversify';
export const ServiceNameSpace = 'Service';
export function Service(namespace: string) {
  if (!namespace) throw new Error('@Service arguments must be a string')
  return ClassMetaCreator.join(
    ClassMetaCreator.define(ServiceNameSpace, namespace),
    injectable() as ClassDecorator
  );
}