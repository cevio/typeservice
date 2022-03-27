import { Container } from 'inversify';
import { createProcess } from '@typeservice/process';
import { ZooKeeper } from '@typeservice/zookeeper';
import { MicroService } from '@typeservice/wsmicro';
import { A } from './services';

const port = 19652;
const container = new Container();
const zookeeper = new ZooKeeper('127.0.0.1:2181');
const microservice = new MicroService({
  container,
  registry: zookeeper,
  services: [A]
})
const [bootstrap, lifecycle] = createProcess(console.error);

lifecycle
  .createServer(createZookeeperServer)
  .createServer(createMicroServer);

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