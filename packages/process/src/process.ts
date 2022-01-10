import * as minimist from 'minimist';
import { createExitListener } from './exit';
import { LifeCycle } from './lifecycle';

export function createProcess<P extends minimist.ParsedArgs>(errorhandler: (e: any) => void) {
  const schema = minimist(process.argv.slice(2)) as P;
  const lifecycle = new LifeCycle<P>();
  const [listen] = createExitListener();
  const bootstrap = () => lifecycle.commit(schema).then(() => {
    process.on('error', errorhandler);
    process.on('uncaughtException', errorhandler);
    process.on('unhandledRejection', errorhandler);
    listen({
      resolve: () => {
        process.off('error', errorhandler);
        process.off('uncaughtException', errorhandler);
        process.off('unhandledRejection', errorhandler);
        return lifecycle.rollback();
      },
      reject: errorhandler,
    })
  }).catch(e => lifecycle.rollback().then(() => errorhandler(e)).finally(() => process.exit(0)));
  return [bootstrap, lifecycle, schema] as const;
}