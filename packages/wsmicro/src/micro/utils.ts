import { UrlWithParsedQuery } from 'url';

export function getVaildURI(setter: Set<UrlWithParsedQuery>, callback: (chunk: UrlWithParsedQuery) => boolean) {
  return Array.from(setter.values()).filter(callback);
}

export function formatURIArray(query: UrlWithParsedQuery['query'], name: string) {
  const methods = query[name] || [];
  return Array.isArray(methods) 
    ? methods
    : [methods];
}

export function createClientKey(host: string, port: number) {
  return host + ':' + port;
}

export function noop() {}