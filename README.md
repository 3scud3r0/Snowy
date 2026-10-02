# Snowy

Vertical slice 3D de snowboard construído com **Three.js + Vite**.

O objetivo desta branch é substituir o protótipo WebGL/Canvas monolítico por uma base de jogo 3D real: terreno geométrico, câmera chase, rider em cena, vegetação instanciada, neve, partículas, checkpoints e HUD.

## Executar

```bash
npm install
npm run dev
```

## Validar

```bash
npm run check
```

## Controles

- `A/D` ou `←/→`: carve
- `Shift` ou `↓`: tuck / buscar velocidade
- `Espaço`: ollie

## Arquitetura

- `src/world`: terreno, vegetação, rochas, teleférico, chalet e checkpoint
- `src/rider`: representação e pose do rider
- `src/snow`: partículas de neve e spray
- `src/rendering`: câmera chase
- `src/game`: estado, física e loop principal
- `src/ui`: HUD

A branch também remove a duplicação de `<head>`, `<body>`, IDs e declarações JavaScript que quebravam o `main` anterior.
