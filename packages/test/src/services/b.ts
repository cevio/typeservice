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