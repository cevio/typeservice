import { Container } from 'inversify';
import { createProcess } from '@typeservice/process';
import { createZookeeperServer, CONTEXT_ZOOKEEPER } from '@typeservice/zookeeper';
import { createWSMricoServer, CONTEXT_WS_MICROSERVER } from '@typeservice/wsmicro';
import { A } from './services';

const port = 19652;
const container = new Container();
const [bootstrap, lifecycle] = createProcess(console.error);

lifecycle
  .createServer(createZookeeperServer({
    path: '127.0.0.1:2181',
    bootstrap: path => console.log('[Bootstrap]', 'zookeeper:', path),
    destroyed: path => console.log('[destroyed]', 'zookeeper:', path),
  }))
  .createServer(createWSMricoServer({
    container, port,
    registry: () => CONTEXT_ZOOKEEPER.value,
    services: [A],
  }));

bootstrap();