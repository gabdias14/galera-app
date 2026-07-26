# WhatsApp: lembretes (B2C) e campanha (B2B)

## Como funciona hoje

O app **não dispara mensagem sozinho**. Ele monta a fila e abre o WhatsApp com o texto pronto — a
pessoa confere e manda. Custo zero, nenhuma aprovação necessária, funciona no mesmo dia.

```
opt-in no RSVP  →  fila (outbox_messages)  →  "Enviar próxima"  →  abre wa.me  →  marca como enviada
```

Dois tipos de mensagem:

- **Lembrete (B2C)** — quem confirmou presença e marcou "quero receber lembrete" recebe o aviso do
  rolê. O anfitrião prepara a fila na aba **Convite**.
- **Campanha (B2B)** — o organizador escolhe um segmento do público e chama pro próximo rolê, com
  link rastreável por campanha. Fica em **Galera Pro → Público**.

### Por que semiautomático e não automático

Mandar mensagem em massa por WhatsApp pessoal é o caminho mais rápido pro número ser banido. O envio
com confirmação humana é lento de propósito: mantém o número vivo enquanto o volume é pequeno, que é
exatamente a fase de lançamento hiperlocal do plano.

Quando a fila passar de umas 50 mensagens por rolê, a conta muda — aí vale a API oficial (abaixo).

## Consentimento (LGPD)

- O opt-in é uma caixinha **desmarcada** no RSVP, com texto explicando o que a pessoa vai receber.
- Sem telefone válido não existe opt-in: o consentimento precisa de um destino (`main.ts`,
  `submitRsvp`).
- O momento do aceite é gravado (`wa_opt_in_at`) — é essa data que prova a base legal.
- Toda mensagem sai com a linha de saída: _"Você autorizou avisos no WhatsApp. Responda SAIR pra
  parar."_ Quem responder SAIR precisa ser desmarcado — hoje isso é manual, e é a primeira coisa a
  automatizar junto com a API oficial.
- Telefone e consentimento ficam em `guest_contacts`, tabela que só o anfitrião lê. Nenhum convidado
  vê o número de outro.

Base legal usada: **consentimento** (art. 7º, I). Dá pra sustentar legítimo interesse pra relação com
cliente existente, mas consentimento explícito é mais defensável e converte melhor — quem aceitou
quer receber.

## Subir pra API oficial (Cloud API)

Quando o volume justificar:

1. **Conta**: WhatsApp Business Platform via Meta ou um BSP (Take Blip, Zenvia, Twilio, 360dialog).
   Precisa de CNPJ e verificação do negócio.
2. **Template**: mensagem iniciada pelo negócio exige template aprovado pela Meta. O texto de campanha
   em `src/lib/messages.ts` já tem o formato certo pra virar template com variáveis:
   `{{1}}` nome, `{{2}}` rolê, `{{3}}` data, `{{4}}` link.
3. **Envio**: a fila já está no banco (`outbox_messages` com `status`), então o disparo vira um
   worker. Numa Supabase Edge Function:

   ```ts
   // supabase/functions/send-whatsapp/index.ts (a escrever)
   const pendentes = await sb.from('outbox_messages').select('*').eq('status', 'pendente').limit(50);
   for (const m of pendentes.data ?? []) {
     const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
       method: 'POST',
       headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
       body: JSON.stringify({
         messaging_product: 'whatsapp',
         to: m.to_phone,
         type: 'template',
         template: { name: 'convite_role', language: { code: 'pt_BR' }, components: [/* ... */] },
       }),
     });
     await sb.from('outbox_messages')
       .update({ status: res.ok ? 'enviado' : 'falhou', sent_at: new Date().toISOString() })
       .eq('id', m.id);
   }
   ```

   O token **nunca** vai pro cliente — só na função, com `service_role`. A UI continua igual: o
   organizador monta a fila do mesmo jeito, só para de clicar em "enviar".
4. **Webhook de resposta**: é aí que "SAIR" vira `wa_opt_in = false` automaticamente, e que a
   confirmação de presença pode voltar pelo próprio WhatsApp.

**Custo**: a Meta cobra por conversa iniciada pelo negócio (categoria marketing), na casa de alguns
centavos de real por conversa no Brasil, com faixa gratuita mensal. Numa campanha de 200 convites dá
troco de cerveja — mas confira a tabela vigente antes de prometer margem.

## Push nativo

Ainda não existe. Dentro do Capacitor o caminho é `@capacitor/push-notifications` + FCM/APNs, e a
mesma tabela `outbox_messages` serve de fila, trocando o canal. O botão "notificar convidados" da
enquete hoje só marca a enquete como notificada e avisa o anfitrião — está anotado como pendência no
README.
