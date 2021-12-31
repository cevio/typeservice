import { ClassMetaCreator } from '@typeservice/decorator';
import { injectable } from 'inversify';

export type THTTPControllerMetaState = boolean;

export function HTTPController() {
  return ClassMetaCreator.join(
    ClassMetaCreator.define(HTTPController.namespace, true),
    injectable() as ClassDecorator,
  )
}

HTTPController.namespace = Symbol('HTTP:CONTROLLER');