# Galera — Brief do projeto

> **Nota:** este é o brief original, de quando o projeto era só o protótipo single-file.
> Ele segue valendo como documento de produto e estratégia. O que a seção 7 lista como
> "prioridade ao retomar" já foi feito nos itens 1 e 2 — veja o README pro status atual.

## O produto, em uma frase

Um "Partiful brasileiro": app de criação de convites de festa, com RSVP, enquete, mural, álbum de fotos pós-evento e lembrete de calendário — pensado desde o início pra virar startup via um loop de crescimento social (ver seção 5).

---

## 1. O que já existe

**Arquivo:** `galera.html` — protótipo funcional completo, single-file (HTML+CSS+JS puro, sem framework, sem build step). Roda abrindo direto no navegador.

**Limitação crítica a resolver primeiro:** o app roda 100% client-side, sem backend. Estado vive em uma variável JS na memória (`var state = {...}`). Isso quer dizer que hoje, se duas pessoas abrirem o mesmo "link" de evento em aparelhos diferentes, elas **não veem os mesmos dados** — cada um tem sua própria cópia local. Antes de qualquer coisa virar produto de verdade, isso precisa de um backend real (detalhes na seção 4).

### Stack atual
- Vanilla JS, sem dependências externas (exceto Google Fonts via `@import`)
- Render pattern: SPA manual — `state` global, `render()` redesenha `#app.innerHTML` inteiro a cada mudança de estado, delegação de eventos via `data-action` em cliques (`document.addEventListener('click', ...)`) e ids específicos em submits/changes
- Sem localStorage/sessionStorage (proibido em artifacts do Claude.ai) — tudo em memória, reseta ao recarregar a página

### Estrutura de dados principal (pra manter ao migrar pro backend)
```js
state.events[i] = {
  id, emoji, title, date, time, location, description, color, pix,
  guests: [{id, name, status /* vou|talvez|nao */, color}],
  mural: [{text, time}],
  polls: [{id, question, options:[{id,text}], votes:{optionId:[nomes]}, notified}],
  photos: [{id, placeholder, url|gradient+emoji, caption, uploader}]
}
```

### Inventário de funções (pra navegar o código rápido)
- **Dados/helpers:** `uid`, `hashStr`, `avatarColor`, `initials`, `escapeHtml`, `makeGuest`, `getEvent`, `parseDate`, `stubDate`, `longDate`, `relativeDays`, `eventIsUnlocked`
- **Calendário:** `pad2`, `icsDateStart`, `icsDateEnd`, `escapeICS`, `buildICS`, `googleCalUrl`, `reminderRowHtml`
- **Views:** `renderHome`, `renderCreate`, `wireCreatePreview`, `renderGuestView`, `renderHostView`, `renderEvent`, `render` (dispatcher principal)
- **Convite:** `inviteCardHtml`, `guestMosaicHtml`
- **Enquetes:** `pollResultsHtml`, `pollVoteHtml`, `pollFormHtml`
- **Álbum:** `photoTileHtml`, `albumGridHtml`, `uploadZoneHtml`, `albumSectionHtml`, `lightboxHtml`
- **Feedback visual:** `fireStamp` (animação de carimbo ao confirmar presença), `fireToast` (notificação simulada)

---

## 2. Sistema de design (não reinventar — só documentar)

**Direção:** vermelho vibrante + branco, energia tipo Tinder, com toques manuais/artesanais de convite de festa (carimbo, ticket perfurado).

- **Cores:** fundo em gradiente vermelho (`--red-1:#FF3B5C` → `--red-2:#E0163B` → `--red-3:#970F30`); cards/superfícies em branco quase puro (`--paper:#FFFCF9`, `--paper-2:#FFF1EC`); tinta escura pra texto em cima de branco (`--ink:#1B1030`); accent coral (`#FF5A72`), amarelo (`#FFC94D`), verde (`#29D398`), roxo (`#8B6FF0`) usados como cor de tema por evento
- **Tipografia:** logo em `Pacifico` (script fluida); títulos em `Bricolage Grotesque`; corpo em `Work Sans`; datas/dados em `Space Mono` (efeito "ticket")
- **Assinatura visual:** cartão de convite com aba perfurada tipo ticket (`.perf`); animação de carimbo de tinta ao confirmar RSVP (`fireStamp`); logo com rabisco (squiggle) embaixo

---

## 3. Features implementadas no protótipo

1. **Criar rolê** — formulário com prévia ao vivo do convite
2. **RSVP** — vou / talvez / não vou, com animação de carimbo + confete
3. **Enquete + notificação** — anfitrião cria pergunta (até 4 opções), convidados votam, resultado em barra, botão "notificar convidados" (simulado com toast — vira notificação push real só depois do backend)
4. **Mural** — avisos do anfitrião pra todos os convidados
5. **Álbum pós-evento** — bloqueado até a data do evento passar; depois libera upload real de fotos (via `FileReader`, em memória) e visualização em grade com lightbox
6. **Lembrete de calendário** — botão de Google Agenda + download de `.ics`, gerado 100% no client (sem backend)
7. **Modo Anfitrião / Convidado** — toggle que simula os dois lados da experiência no mesmo protótipo

---

## 4. Roadmap técnico até a App Store

**Não consigo publicar o app — isso exige a conta de desenvolvedor Apple do Gabriel, um Mac com Xcode, e submissão manual. Meu papel é preparar o terreno técnico.**

- **Backend:** Supabase (Postgres + Auth + Storage + Realtime) — substitui o `state` em memória por dados reais e sincronizados. Prioridade #1, tudo mais depende disso.
- **Empacotamento:** Capacitor (Ionic) — pega o mesmo HTML/CSS/JS (depois de conectado à API real) e gera projeto iOS nativo de verdade. Caminho recomendado em vez de reescrever nativo, porque reaproveita 100% do trabalho de design/UX já feito.
- **Requisitos Apple:** Apple Developer Program (US$99/ano), Mac + Xcode (ou build em nuvem tipo Codemagic), ficha completa na App Store Connect, política de privacidade publicada, passar pela App Review (24–72h, ~40% dos apps levam pelo menos uma rodada de ajuste).
- **Fases:** (0) protótipo ✅ → (1) backend real → (2) empacotar com Capacitor → (3) beta no TestFlight → (4) submissão.

---

## 5. Estratégia de crescimento (a tese de startup)

**O mecanismo:** o app não devia gastar em aquisição paga — ele gera, como efeito colateral de ser usado, uma peça que as pessoas *querem* postar fora do app. Mesmo padrão do Spotify Wrapped, BeReal, Partiful.

- **Loop:** criar rolê → convidados confirmam/votam/sobem foto → app gera o **Recap do rolê** (imagem estilo Stories, 1080×1920, com nº de confirmados, resultado da enquete, mosaico de fotos, marca "criado no Galera") → anfitrião posta → quem vê fica curioso → baixa o app → cria o próprio rolê.
- **Peça que falta construir:** o gerador do Recap. Ainda não existe no protótipo — é o próximo passo de produto mais importante, porque é o que faz a distribuição ser grátis.
- **Regra de ouro:** a marca do Galera no Recap não deve ser removível facilmente, nem no plano pago — é o motor de crescimento, não decoração.
- **Monetização (sem tocar no loop grátis):** patrocínio B2B de tema/pergunta de enquete (bares, marcas de bebida); taxa pequena sobre vaquinha PIX (feature que já existe); planos pra organizadores recorrentes (produtoras, reps de balada).
- **Lançamento:** hiperlocal primeiro (rede do Gabriel — handebol, USP, colegas), aproveitando sazonalidade (Carnaval, formatura, festa junina), com repúblicas/centros acadêmicos da USP como canal de distribuição barato.
- **Métricas que importam:** taxa de compartilhamento do Recap, taxa de conversão de quem vê pra quem cria conta, K-factor.

---

## 6. Posicionamento vs. grupo de WhatsApp

**Tese:** o Galera não compete com o WhatsApp pra conversar — ele tira do WhatsApp uma tarefa que ele faz mal, que é *gerenciar quem vai*. O convite continua sendo compartilhado *via* WhatsApp (o botão de share já abre lá).

Onde o grupo quebra: confirmação vira arqueologia de scroll; adicionar gente novo expõe o número de todo mundo; enquete nativa some no histórico; fotos ficam misturadas com o resto da conversa; o grupo nunca morre depois do evento; zero dado real pro anfitrião.

Onde o Galera ganha: contador de confirmados em tempo real, convite sem expor contato de ninguém, enquete fixa e visível, álbum separado, lembrete de um toque.

O ponto mais importante pro negócio: um grupo de WhatsApp não gera nenhum artefato exportável — ninguém printa uma conversa e posta no Stories. É por isso que o Recap (seção 5) só funciona fora de um grupo de chat.

Frase-resumo: *"O WhatsApp organiza a conversa. O Galera organiza o rolê."*

---

## 7. Prioridade sugerida ao retomar

1. Desenhar o schema Supabase (eventos, convidados, RSVPs, enquetes, fotos) e trocar o `state` em memória por chamadas de API real
2. Construir o gerador do Recap do rolê (é o que destrava a tese de crescimento inteira)
3. Empacotar com Capacitor e testar num iPhone real
4. Só depois: ficha da loja, política de privacidade, submissão
