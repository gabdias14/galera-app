import { describe, expect, it } from 'vitest';
import { renderHostView } from '../src/views/event';
import { state } from '../src/state';
import { makeEvent, makeGuest } from './fixtures';

describe('renderHostView — lista de convidados em rolê grande', () => {
  it('não desenha todo mundo de uma vez (item #24 do backlog)', () => {
    state.eventTab = 'convidados';
    const guests = Array.from({ length: 90 }, (_, i) => makeGuest(`Convidado ${i}`, 'vou'));
    const ev = makeEvent({ guests });

    const html = renderHostView(ev);
    const rows = html.match(/class="guest-row"/g) ?? [];
    expect(rows.length).toBe(60);
    expect(html).toContain('+30 convidados');
  });
});
