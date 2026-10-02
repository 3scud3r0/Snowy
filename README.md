# Snowy

Uma descida cinematográfica de snowboard e ski renderizada em WebGL. O protótipo abandona menus e painéis de configuração: a experiência abre diretamente na montanha e todo feedback acontece sobre a imagem.

## Executar

Uma visão interativa e um primeiro vertical slice conceitual para **Snowy**, um jogo de snowboard e ski em mundo aberto onde a qualidade da linha importa mais do que a pontuação.

## Executar

O projeto não possui dependências de runtime. Abra `index.html` diretamente ou sirva a pasta:

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

Depois acesse `http://localhost:4173`.

## GitHub Pages

O workflow `.github/workflows/pages.yml` valida o núcleo do jogo e publica automaticamente o build estático no GitHub Pages após pushes nas branches `main`, `master` ou `work`. Também é possível iniciá-lo manualmente em **Actions → Deploy Snowy to GitHub Pages → Run workflow**.

No primeiro uso do repositório, abra **Settings → Pages** e confirme **Source: GitHub Actions**. Depois do job `Publish GitHub Page`, a URL pública aparece no resumo do deployment e no environment `github-pages`.

O site publicado funciona como PWA: pode ser instalado pelo botão **Instalar** em navegadores compatíveis e o shell principal fica disponível offline após a primeira visita.

## Protótipo jogável

- **← / →** ou **A / D**: carve
- **↓**: tuck para reduzir o arrasto e ganhar velocidade
- **Espaço (segure e solte)**: carregar e executar um ollie
- **Z / X no ar**: controlar a rotação manualmente
- Passe perto de árvores e rochas, use rampas, conecte movimentos e pouse alinhado para construir FLOW.

O trecho alterna dinamicamente entre powder, neve compactada e gelo. Cada superfície possui aceleração, velocidade máxima, aderência e arrasto próprios. A interface também possui controles de toque em telas menores.

## Escopo apresentado

- visão e identidade do jogo;
- cinco pilares de design;
- core gameplay loop;
- fundamentos de movimento e controles;
- física e comportamento das superfícies;
- estrutura vertical da primeira montanha;
- sistema FLOW;
- blueprint do primeiro ciclo Gauntlet;
- protótipo rejogável da **Linha Zero** com resultado e avaliação da descida.


## Qualidade

Execute toda a validação local com:

```bash
npm test
npm run check
```

Os testes cobrem as superfícies, geração determinística, aterrissagens, FLOW, objetivos, qualidade de linha, manifesto PWA, cache offline e contrato de deployment.
Os testes cobrem a seleção cíclica das superfícies, o gerador determinístico do percurso, avaliação de aterrissagens, classificação final e linguagem do FLOW.

## Recursos adicionais da Linha Zero

- seleção entre snowboard e ski, com silhuetas distintas;
- condição de céu aberto ou nevasca com visibilidade reduzida;
- áudio procedural opcional de vento, velocidade, borda e impacto via Web Audio;
- pausa, retomada e reinício rápido;
- progresso da montanha e checkpoints de Cume, Geleira, Bosque e Vale;
- objetivo de linha, avaliação de precisão e melhor resultado persistido localmente.

## Linhas e replay

O jogador pode alternar entre três leituras do mesmo trecho:

- **FLOW:** equilíbrio entre fluidez, precisão e velocidade;
- **Velocidade:** percurso mais aberto, com meta de velocidade máxima;
- **Técnica:** maior densidade de obstáculos e exigência de linha limpa.

Cada tentativa é gravada em memória. Ao concluir, é possível rever a descida ou reiniciar com a tentativa anterior representada como um ghost, permitindo comparar trajetórias sem interromper o ritmo.

## Técnicas avançadas e qualidade da linha

Além de ollies e rotações, o slice suporta grabs com **C/V** e butter no solo segurando **Shift**. A avaliação final não é um placar bruto: ela decompõe a descida em velocidade, precisão, criatividade, risco e fluidez. Repetir apenas uma ação não produz uma linha de alta qualidade; variedade, proximidade, tempo no ar, combos e pousos limpos trabalham em conjunto.

## Replay Studio

Ao finalizar, **Abrir Replay Studio** reproduz a tentativa com timeline navegável, play/pause, câmera chase, drone ou lateral e velocidades de 0,25× a 2×. **Exportar linha** salva um arquivo `snowy-line-v1` em JSON com modalidade, rota, clima, resumo e frames da trajetória — uma base portátil para compartilhamento e futura edição cinematográfica.
