# Snowy

Uma descida cinematográfica de snowboard e ski renderizada em WebGL. O protótipo abandona menus e painéis de configuração: a experiência abre diretamente na montanha e todo feedback acontece sobre a imagem.

## Executar

```bash
python3 -m http.server 4173
```

Acesse `http://localhost:4173` e clique em **Iniciar descida**.

## Controles

- **← / →** ou **A / D** — carve e transferência de borda;
- **↓** — tuck para buscar velocidade máxima;
- **Espaço (segure e solte)** — carregue e execute um ollie;
- botão **Ⅱ** — pause e retome a descida;
- **Áudio** — ativa vento procedural que responde à velocidade e à pressão de borda.

## Direção visual

A montanha é renderizada em tempo real por um shader WebGL de terreno procedural. O renderer utiliza ray marching, heightfield fractal, normais de superfície, neve iluminada, reflexos especulares, árvores procedurais, neblina atmosférica, vinheta, grão de filme e linhas de velocidade. Não há vídeo ou imagem de fundo mascarando a experiência.

A interface se limita à informação que um atleta usaria durante a linha: velocidade, FLOW, altitude, superfície e progresso vertical. Estados importantes aparecem brevemente e desaparecem para devolver a tela à montanha.

## Física e FLOW

O núcleo continua diferenciando powder, neve compactada e gelo por aderência, amortecimento, aceleração, arrasto e velocidade máxima. Curvas, tuck, ollies e pousos alimentam o FLOW; a nota final considera qualidade e precisão, não somente um contador de pontos.

## GitHub Pages

O workflow `.github/workflows/pages.yml` testa e publica o jogo automaticamente após pushes em `main`, `master` ou `work`. No primeiro uso, selecione **Settings → Pages → Source: GitHub Actions**. A URL pública será mostrada no environment `github-pages` após o job `Publish GitHub Page`.

## Qualidade

```bash
npm test
npm run check
```

Os testes cobrem as superfícies, geração determinística, aterrissagens, FLOW, objetivos, qualidade de linha, manifesto PWA, cache offline e contrato de deployment.
