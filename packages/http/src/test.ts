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