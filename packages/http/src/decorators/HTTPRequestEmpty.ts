import { ParameterMetaCreator } from '@typeservice/decorator';

export function HTTPRequestValue<T = any>(defaultValue?: T) {
  return ParameterMetaCreator.define(() => defaultValue);
}