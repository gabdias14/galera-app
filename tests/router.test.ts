import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash } from '../src/router';

describe('parseRoute', () => {
  it('abre o convite a partir do link compartilhado', () => {
    expect(parseRoute('#/e/abc-123')).toEqual({ name: 'event', id: 'abc-123', code: null });
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
    expect(parseRoute('#/e/a%20b')).toEqual({ name: 'event', id: 'a b', code: null });
  });

  it('lê o link de convidado com código do promoter', () => {
    expect(parseRoute('#/e/abc/c/k7m2qx')).toEqual({ name: 'event', id: 'abc', code: 'K7M2QX' });
  });

  it('lê a rota da portaria', () => {
    expect(parseRoute('#/e/abc/portaria')).toEqual({ name: 'door', id: 'abc' });
  });

  it('lê o link público do promoter', () => {
    expect(parseRoute('#/promoter/tok-abc123')).toEqual({ name: 'promoter', token: 'tok-abc123' });
  });

  it('lê as abas do Galera Pro', () => {
    expect(parseRoute('#/pro')).toEqual({ name: 'pro', tab: 'painel' });
    expect(parseRoute('#/pro/publico')).toEqual({ name: 'pro', tab: 'publico' });
    expect(parseRoute('#/pro/inventada')).toEqual({ name: 'pro', tab: 'painel' });
  });

  it('faz roundtrip com routeToHash', () => {
    const route = { name: 'event', id: 'xyz', code: null } as const;
    expect(parseRoute(routeToHash(route))).toEqual(route);

    const comCodigo = { name: 'event', id: 'xyz', code: 'ABC123' } as const;
    expect(parseRoute(routeToHash(comCodigo))).toEqual(comCodigo);

    const portaria = { name: 'door', id: 'xyz' } as const;
    expect(parseRoute(routeToHash(portaria))).toEqual(portaria);

    const promoter = { name: 'promoter', token: 'tok-abc123' } as const;
    expect(parseRoute(routeToHash(promoter))).toEqual(promoter);
  });
});
