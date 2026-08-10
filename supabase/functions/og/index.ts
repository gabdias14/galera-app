// Edge Function: preview de convite pro WhatsApp/Instagram/Telegram (item 9
// de docs/melhorias.md). O app é uma SPA em hash route (`#/e/<id>`), que
// crawler de rede social não executa — sem isso, todo link do Galera chega
// pelado, sem emoji, título, data nem contador de confirmados.
//
// Como funciona: aponte `/e/<id>` (sem hash) pra essa função só pro
// user-agent de crawler (regra no CDN/hosting — Cloudflare Worker, rewrite
// da Vercel/Netlify etc.); humanos continuam caindo na SPA normal via
// `#/e/<id>`. Essa função devolve um HTML mínimo com as meta tags certas e
// um `<meta http-equiv="refresh">` pra quem abrir o link direto no navegador.
//
// Requer um projeto Supabase implantado (fora do alcance deste ambiente sem
// credenciais) — o código está pronto, falta o `supabase functions deploy og`
// e a regra de roteamento por user-agent na camada de hospedagem.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const PUBLIC_URL = Deno.env.get('PUBLIC_URL') ?? '';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split('/').filter(Boolean).pop();

  if (!id || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response('not found', { status: 404 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: event } = await sb
    .from('events')
    .select('id, emoji, title, date, time, location')
    .eq('id', id)
    .maybeSingle();

  if (!event) return new Response('not found', { status: 404 });

  const { count } = await sb
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'vou');

  const confirmed = count ?? 0;
  const title = `${event.emoji} ${event.title}`;
  const description =
    `${longDate(event.date)} às ${event.time}` +
    (event.location ? ` · ${event.location}` : '') +
    (confirmed > 0 ? ` · ${confirmed} confirmado${confirmed === 1 ? '' : 's'}` : '');
  const targetUrl = `${PUBLIC_URL.replace(/\/$/, '')}/#/e/${event.id}`;

  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Galera">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(targetUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
</head><body>
<p>Abrindo o convite... <a href="${escapeHtml(targetUrl)}">clique aqui</a> se não redirecionar sozinho.</p>
</body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
});
