import { EventEmitter } from 'events';
import { UrlWithParsedQuery, format, parse } from 'url';
import { createClient, Client, State, CreateMode, Event, Stat } from 'node-zookeeper-client';
import { TRegistry } from '@typeservice/wsmicro';
import { localhost, createContext } from '@typeservice/process';
import { ZookeeperOfflineException } from './offlineException';
import { ZookeeperPathNotFoundException } from './NotFoundException';

export * from './offlineException';
export * from './NotFoundException';

export class ZooKeeper extends EventEmitter implements TRegistry {
  private readonly client: Client;
  private readonly pathes = new Set<string>();
  private connected = false;
  constructor(path: string, private readonly protocol: string = 'wsmicro') {
    super();
    this.setMaxListeners(+Infinity);
    this.client = createClient(path);
    this.client.on('state', state => {
      if (state === State.SYNC_CONNECTED) {
        this.connected = true;
        this.emit('reconnect');
      } else if (state === State.DISCONNECTED) {
        this.connected = false;
        this.emit('disconnect');
      } else if (state === State.EXPIRED) {
        this.connected = false;
        this.emit('expired');
      }
    })
  }

  public connect() {
    return new Promise<void>((resolve, reject) => {
      const handler = (err?: any) => {
        this.client.off('connected', handler);
        if (err) return reject(err);
        resolve()
      }
      this.client.on('connected', handler)
      this.client.connect();
    })
  }

  public close() {
    return this.client.close();
  }

  private toProviderPath(namespace: string, port: number, query: {
    methods: string[],
    subscribes: string[],
    publishes: string[],
  }, extras: Record<string, string | number | boolean> = {}) {
    const obj = {
      protocol: this.protocol,
      slashes: true,
      host: localhost + ':' + port,
      pathname: '/' + namespace,
      query: {
        methods: query.methods.sort(),
        subscribes: query.subscribes.sort(),
        publishes: query.publishes.sort(),
        ...extras
      }
    }
    const uri = format(obj);
    const interface_root_path = `/${this.protocol}/${namespace}`;
    const interface_dir_path = interface_root_path + '/providers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(uri);
    return interface_entry_path;
  }

  private toConsumerPath(namespace: string, port: number, extras: Record<string, string | number | boolean> = {}) {
    const obj = {
      protocol: this.protocol,
      slashes: true,
      host: localhost + ':' + port,
      pathname: '/' + namespace,
      query: {
        ...extras
      }
    }
    const uri = format(obj);
    const interface_root_path = `/${this.protocol}/${namespace}`;
    const interface_dir_path = interface_root_path + '/consumers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(uri);
    return interface_entry_path;
  }

  private async create(url: string) {
    if (!this.connected) throw new ZookeeperOfflineException();
    const sp = url.split('/');
    let path: string = '';
    for (let i = 1; i < sp.length; i++) {
      path = path + '/' + sp[i];
      const mode = i === sp.length - 1 
        ? CreateMode.EPHEMERAL 
        : CreateMode.PERSISTENT;
      await this._create(path, mode);
    }
  }

  private async _create(uri: string, mode: number) {
    if (!(await this.exists(uri))) {
      return await new Promise<string>((resolve, reject) => {
        this.client.create(uri, mode, (err, node) => {
          if (err) return reject(err);
          resolve(node);
        })
      })
    }
  }

  private exists(uri: string) {
    return new Promise<boolean>((resolve, reject) => {
      this.client.exists(uri, (err, stat) => {
        if (err) return reject(err);
        return resolve(!!stat);
      });
    });
  }

  private async remove(uri: string) {
    if (!this.connected) throw new ZookeeperOfflineException();
    if (await this.exists(uri)) {
      await new Promise<void>((resolve, reject) => {
        this.client.remove(uri, err => {
          if (err) return reject(err);
          resolve();
        })
      });
    }
  }

  private async query(path: string, feedback: (e: Event) => void) {
    if (!this.connected) throw new ZookeeperOfflineException();
    return await new Promise<string[]>((resolve, reject) => {
      const callback = (err: Error, children: string[], stat?: Stat) => {
        if (err) return reject(err);
        if (stat) return resolve(children);
        return reject(new ZookeeperPathNotFoundException('cannot find zookeeper path', path));
      };
      this.client.getChildren(path, (e) => feedback(e), callback);
    })
  }

  private watcher(e: Event, callback?: (s: string[]) => void): Promise<string[]> {
    if (e.type === 4) {
      return this.query(
        e.path, 
        !!callback ? ex => this.watcher(ex, callback).then(callback) : undefined
      ).then(res => res.map(path => decodeURIComponent(path)));
    }
    return Promise.resolve([]);
  }

  public async mountProvider(namespace: string, port: number, query: {
    methods: string[],
    subscribes: string[],
    publishes: string[],
  }, extras: Record<string, string | number | boolean> = {}): Promise<void> {
    const path = this.toProviderPath(namespace, port, query, extras);
    await this.create(path);
    this.pathes.add(path);
  }

  public async mountConsumer(namespace: string, port: number, extras: Record<string, string | number | boolean> = {}): Promise<void> {
    const path = this.toConsumerPath(namespace, port, extras);
    await this.create(path);
    this.pathes.add(path);
  }

  public async unmountAll(): Promise<void> {
    await Promise.all(Array.from(this.pathes.values()).map(path => this.remove(path)));
  }

  public async findInterface(intername: string, watch?: (uris: UrlWithParsedQuery[]) => void): Promise<UrlWithParsedQuery[]> {
    const key = `/${this.protocol}/${intername}/providers`;
    const _format = (res: string[]) => res.map(r => parse(r, true));
    const ex = new Event(4, 'NODE_CHILDREN_CHANGED', key);
    const pathes = await this.watcher(ex, !!watch ? res => watch(_format(res)) : undefined);
    return _format(pathes);
  }
}

export interface TCreateZookeeperServerProps {
  path: string | (() => string | Promise<string>),
  bootstrap?: (path: string) => any | Promise<any>,
  destroyed?: (path: string) => any | Promise<any>,
}

export const CONTEXT_ZOOKEEPER = createContext<ZooKeeper>(undefined);

export function createZookeeperServer(configs: TCreateZookeeperServerProps) {
  return async () => {
    const path = typeof configs.path === 'function'
      ? await Promise.resolve((configs.path as () => string | Promise<string>)())
      : configs.path;
    const zookeeper = new ZooKeeper(path);
    await zookeeper.connect();
    CONTEXT_ZOOKEEPER.setContext(zookeeper);
    if (configs.bootstrap) await Promise.resolve(configs.bootstrap(path));
    return async () => {
      zookeeper.close();
      CONTEXT_ZOOKEEPER.setContext(undefined);
      if (configs.destroyed) await Promise.resolve(configs.destroyed(path));
    }
  }
}