import { createServer } from 'http';
import { Container } from 'inversify';
import { createProcess } from '@typeservice/process';
import { createZookeeperServer, CONTEXT_ZOOKEEPER } from '@typeservice/zookeeper';
import { CONTEXT_WS_MICROSERVER, createWSMricoServer } from '@typeservice/wsmicro';
import { B } from './services';

const port = 19653;
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
    services: [B],
  }))
  .createServer(createHTTPServer);

bootstrap();

async function createHTTPServer() {
  const microservice = CONTEXT_WS_MICROSERVER.value;
  const server = createServer((req, res) => {
    const a = 23423;
    const b = 32432;
    microservice.sendback<number>({
      interface: 'com.test.a',
      method: 'sum',
      arguments: [a, b]
    }).then(result => {
      res.statusCode = 200;
      res.end('a + b = ' + result);
    }).catch(e => {
      res.statusCode = 500;
      res.end(e.message);
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.listen(port + 1, (err?: any) => {
      if (err) return reject(err);
      resolve();
      console.log('http on', port + 1);
    })
  })
  return () => server.close();
}