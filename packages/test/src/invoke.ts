import { createServer } from 'http';
import { Container } from 'inversify';
import { createProcess } from '@typeservice/process';
import { ZooKeeper } from '@typeservice/zookeeper';
import { MicroService } from '@typeservice/wsmicro';
import { B } from './services';

const port = 19653;
const container = new Container();
const zookeeper = new ZooKeeper('127.0.0.1:2181');
const microservice = new MicroService({
  container,
  registry: zookeeper,
  services: [B]
})
const [bootstrap, lifecycle] = createProcess(console.error);

lifecycle
  .createServer(createZookeeperServer)
  .createServer(createMicroServer)
  .createServer(createHTTPServer);

bootstrap();

async function createZookeeperServer() {
  await zookeeper.connect();
  console.log('Zookeeper is connected');
  return () => zookeeper.close();
}

async function createMicroServer() {
  await microservice.listen(port);
  console.log('ws micro service on', port);
  return () => microservice.close();
}

async function createHTTPServer() {
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