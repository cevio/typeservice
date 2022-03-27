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