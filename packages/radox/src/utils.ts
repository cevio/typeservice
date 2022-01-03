import { networkInterfaces } from 'os';
export function diff(a: string[], b: string[]) {
  const removes = [];
  const commons = [];
  
  a = a.slice().sort();
  b = b.slice().sort();
  
  for (let i = 0; i < a.length; i++) {
    const value = a[i];
    const index = b.indexOf(value);
    if (index === -1) {
      removes.push(value);
    } else {
      commons.push(value);
      b.splice(index, 1);
    }
  }
  return {
    removes, commons,
    adds: b
  }
}

export const heatbeat = 5000;

const interfaces = networkInterfaces();

export const localhost = Object.keys(interfaces).map(function(nic) {
  const addresses = interfaces[nic].filter(details => details.family.toLowerCase() === "ipv4" && !isLoopback(details.address));
  return addresses.length ? addresses[0].address : undefined;
}).filter(Boolean)[0];

function isLoopback(addr: string): boolean {
  return (
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr) ||
    /^fe80::1$/.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr)
  );
}