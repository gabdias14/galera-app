import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash } from '../src/router';

describe('parseRoute', () => {
  it('abre o convite a partir do link compartilhado', () => {
    expect(parseRoute('#/e/abc-123')).toEqual({ name: 'event', id: 'abc-123' });
  });

  it('aceita a tela de criação', () => {
    expect(parseRoute('#/novo')).toEqual({ name: 'create' });
  });

  it('cai na home em hash vazio ou desconhecido', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/qualquer-coisa')).toEqual({ name: 'home' });
  });

  it('decodifica id com caractere especial', () => {
    expect(parseRoute('#/e/a%20b')).toEqual({ name: 'event', id: 'a b' });
  });

  it('faz roundtrip com routeToHash', () => {
    const route = { name: 'event', id: 'xyz' } as const;
    expect(parseRoute(routeToHash(route))).toEqual(route);
  });
});
