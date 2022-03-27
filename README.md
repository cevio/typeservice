# TypeService

基于NodeJS的服务架构，提供完善的解决方案。

- 完全的进程管理模型 `@typeservice/process`
- HTTP 服务架构 `@typeservice/http`
- 基于WS通讯的微服务架构 `@typeservice/wsmicro`

## 完全的进程管理模型

进程的启动与结束的生命周期拦截处理

```ts
import { createProcess } from '@typeservice/process';
const [bootstrap, lifecycle] = createProcess(console.error);
lifecycle.createServer(...).createServer(...);
bootstrap();
```

## HTTP 服务架构

提供一整套开箱即用的HTTP服务搭建架构体系

```ts
import { Context, Next } from 'koa';
import * as bodyParser from 'koa-bodyparser';
import { HttpMovedPermanentlyException, HttpFoundException, HttpAcceptedException } from '@typeservice/exception';
import { 
  HTTP, 
  Container, 
  HTTPMiddleware, 
  HTTPMiddlewareImplements, 
  HTTPController, 
  HTTPControllerMiddleware, 
  HTTPRouter,
  HTTPRequestQuery,
  HTTPRequestHeader,
  HTTPRequestParam,
  HTTPRequestBody,
  HTTPRouterMiddleware,
} from '.';

@HTTPMiddleware()
class TestMiddleware implements HTTPMiddlewareImplements {
  public async use(ctx: Context, next: Next) {
    // console.log('in Middleware:', ctx.path);
    console.log(ctx.state);
    await next();
  }
}

@HTTPController()
@HTTPControllerMiddleware(TestMiddleware)
class TestController {
  @HTTPRouter({
    pathname: '/test/:id',
    methods: 'POST'
  })
  @HTTPRouterMiddleware(async (ctx, next) => {
    // console.log('in2')
    await next();
  })
  public async onTest(
    @HTTPRequestQuery() query: Record<string, string>,
    @HTTPRequestHeader() headers: Record<string, string>,
    @HTTPRequestParam() params: Record<string, string>,
    @HTTPRequestBody() body: any
  ) {
    // console.log('query', query)
    // console.log('headers', headers)
    // console.log('params', params)
    // console.log('body', body)
    const x = new HttpAcceptedException({
      query, headers, params, body
    })
    x.set('x-use', 'zexpress')
    throw x;
    return {
      query, headers, params, body
    };
  }
}

const container = new Container();
const http = new HTTP(container);

http.use(bodyParser())
http.createService(TestController);
http.use(http.routes());

http.listen(3000, () => {
  console.log('http: 3000')
})
```

## 基于WS通讯的微服务架构

提供一整套完整的微服务架构体系，具备一下能力

1. 微服务请求响应
2. 微服务数据订阅

```ts
import { Container } from 'inversify';
import { createProcess } from '@typeservice/process';
import { createZookeeperServer, CONTEXT_ZOOKEEPER } from '@typeservice/zookeeper';
import { createWSMricoServer } from '@typeservice/wsmicro';
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
```

Service编写 - 发布者

```ts
import { Service, Public, Publish } from '@typeservice/wsmicro';
import { ref } from '@vue/reactivity';

@Service('com.test.a')
export class A {
  private readonly time = ref(Date.now());

  constructor() {
    setInterval(() => {
      this.time.value = Date.now();
    }, 1000).unref();
  }

  @Publish()
  public use() {
    console.log('in', this.time.value)
    return this.time.value + 1000;
  }

  @Public()
  public sum(a: number, b: number) {
    return a + b;
  }
}
```

Service编写 - 订阅者

```ts
import { Public, Service, Subscribe } from '@typeservice/wsmicro';

@Service('com.b')
export class B {
  @Public()
  public reduce(a: number, b: number) {
    return a - b;
  }

  @Subscribe('com.test.a', 'use')
  public joker(res: number) {
    console.log('now:', res);
  }
}
```