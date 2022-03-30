import 'reflect-metadata';
import { injectable as inversifyInjectable, METADATA_KEY } from 'inversify';

export function injectable() {
  return (target: any) => {
    if (Reflect.hasOwnMetadata(METADATA_KEY.PARAM_TYPES, target)) return;
    inversifyInjectable()(target);
  }
}