import { operation } from 'retry';
import { UrlWithParsedQuery } from 'url';
import { getVaildURI, formatURIArray, noop } from './utils';
import { TRegistry, TMicroServiceRequestProps, TMicroServiceNamespaceStackProps } from './interface';
import { TRetryConfigs } from '../client/interface';
import { RegistryNotMatchedException } from '../exceptions';

export class InterfaceNamspace extends Set<UrlWithParsedQuery> {
  private status: 0 | 1 | 2 = 0;
  private readonly stacks = new Set<TMicroServiceNamespaceStackProps>();

  constructor(
    private readonly name: string,
    private readonly registry: TRegistry,
    private readonly retryConfigs: TRetryConfigs,
  ) {
    super();
  }

  public reset() {
    this.status = 0;
  }

  private update(uris: UrlWithParsedQuery[]) {
    this.clear();
    uris.forEach(uri => this.add(uri));
  }

  public get(
    method: string, 
    type: 'methods' | 'publishes' | 'subscribes', 
    strategy: TMicroServiceRequestProps['strategy'] = uris => uris[0],
  ) {
    return new Promise<UrlWithParsedQuery>(resolve => {
      this.stacks.add({ method, type, strategy, resolve });
      this.watching();
    })
  }

  private find() {
    return new Promise<void>((resolve, reject) => {
      const oper = operation(this.retryConfigs);
      oper.attempt(() => {
        this.registry.findInterface(this.name, uris => this.update(uris)).then(uris => {
          if (uris.length) return resolve(this.update(uris));
          if (!oper.retry(new RegistryNotMatchedException(this.name))) return reject(oper.mainError());
        }).catch(e => {
          if (!oper.retry(e)) return reject(oper.mainError());
        })
      })
    })
  }

  private watching() {
    switch (this.status) {
      case 0:
        this.status = 1;
        this.find().catch(noop).finally(() => {
          this.status = 2;
          this.watching();
        });
        break;
      case 2:
        const chunks = Array.from(this.stacks.values());
        this.stacks.clear();
        chunks.forEach(chunk => this.execute(chunk));
        break;
      default: break;
    }
  }

  private execute(state: TMicroServiceNamespaceStackProps) {
    let vaildURIs: UrlWithParsedQuery[];
    switch (state.type) {
      case 'methods': vaildURIs = getVaildURI(this, chunk => formatURIArray(chunk.query, 'methods').includes(state.method)); break;
      case 'publishes': vaildURIs = getVaildURI(this, chunk => formatURIArray(chunk.query, 'publishes').includes(state.method)); break;
      case 'subscribes': vaildURIs = getVaildURI(this, chunk => formatURIArray(chunk.query, 'subscribes').includes(state.method)); break;
    }
    if (!vaildURIs || !vaildURIs.length) return state.resolve();
    return state.resolve(state.strategy(vaildURIs));
  }
}