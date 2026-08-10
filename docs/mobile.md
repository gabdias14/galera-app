# Empacotar pro iPhone (Capacitor)

O app é web. O Capacitor embrulha o mesmo `dist/` num projeto iOS nativo — aproveita 100% do
design e da lógica, sem reescrever nada.

## Pré-requisitos (só existem no Mac do Gabriel)

- macOS com **Xcode** instalado
- **CocoaPods** (`sudo gem install cocoapods`)
- Conta no **Apple Developer Program** (US$ 99/ano) pra TestFlight e App Store

Nada disso pode ser feito daqui — o que está pronto é o terreno: `capacitor.config.ts`, os scripts
e o build web.

## Passo a passo

```bash
npm install
npm run build

npx cap add ios          # cria a pasta ios/ (só na primeira vez)
npm run cap:sync         # build + copia o dist/ pro projeto nativo
npm run cap:ios          # abre no Xcode
```

No Xcode: selecione o time de desenvolvimento em **Signing & Capabilities**, escolha um iPhone
conectado e dê Run.

Repita `npm run cap:sync` sempre que mudar o código web.

## O que conferir no aparelho

- [ ] **Rota do convite.** O app usa rotas em hash (`#/e/<id>`) justamente porque dentro do Capacitor
      a origem é `capacitor://` — sem servidor pra resolver caminhos. Abrir um link colado deve cair
      no convite certo.
- [ ] **Compartilhar o Recap.** `navigator.share` com arquivo funciona no WKWebView do iOS 15+.
      Se falhar, o app cai no download — no iPhone isso é pior, então vale testar de verdade.
- [ ] **Upload de foto.** `<input type="file" accept="image/*">` abre a câmera/galeria; a permissão
      de fotos precisa da chave `NSPhotoLibraryUsageDescription` no `Info.plist` com um texto em
      português explicando o uso ("para você postar fotos no álbum do rolê").
- [ ] **Fontes.** Hoje vêm do Google Fonts pela rede. Num app instalado, considere baixá-las pro
      bundle: sem rede, o Recap sai com fonte de sistema em vez da identidade da marca.
- [ ] **Safe area.** O CSS já usa `viewport-fit=cover`; confira o notch e a barra inferior.

## Deep links (depois)

Pra um link `https://galera.app/#/e/<id>` abrir direto no app instalado, configure Universal Links:
`apple-app-site-association` no domínio + capability **Associated Domains** no Xcode. Não é bloqueante
pro TestFlight — o link continua abrindo no navegador, que é o comportamento certo pra quem ainda
não instalou (e é justamente por onde entra gente nova).

## Antes de submeter

- Política de privacidade publicada num link fixo (a App Review exige, e o app coleta nome e fotos)
- Ficha na App Store Connect: ícone 1024×1024, screenshots por tamanho de tela, descrição em pt-BR
- Preencher o **App Privacy** (o que coleta: nome digitado pelo convidado, fotos enviadas ao álbum)
- Contar ~24–72h de review, com boa chance de uma rodada de ajuste
