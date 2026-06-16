# Teal Cap Runner

Teal Cap Runner is a tiny playable browser game prototype built end to end with Codex: character sprite ideation, sprite-sheet generation and cleanup, animation state logic, interactive environment sprites, canvas gameplay, validation scripts, and the final fullscreen demo.

This repo is an exploration of how far Codex can get from a handful of simple prompts: starting from “make a little pixel-art running character,” then expanding into animation states, a state machine, a living meadow environment, and a playable game loop.

## Play

From the repo root:

```bash
cd demo
npm install
npm run serve
```

Then open:

```text
http://127.0.0.1:8123/demo/
```

## Controls

- Move: `ArrowLeft` / `ArrowRight` or `A` / `D`
- Sprint: `Shift`
- Jump: `Space`, `ArrowUp`, or `W`
- Crouch: `ArrowDown` or `S`
- Dash: `X` or `J`

## What Is Included

- Fullscreen canvas game demo with an in-game overlay HUD
- Pixel-art character sheets for `idle`, `walk`, `run`, `sprint`, `jump`, `crouch`, `dash`, and `skid`
- A “Windmill Courier Meadow” environment with animated grass, flowers, birds, dust, stones, props, and parallax hills
- Interaction hooks: flowers react when you pass, dust appears when dashing, and stones pop subtly on landing
- Validation scripts for gameplay state transitions and visual interaction screenshots

## Project Layout

```text
animation-plan.json          Character animation manifest
environment-manifest.json    Environment sprite manifest
demo/                        Fullscreen canvas game
environment/                 Environment sprite PNG sheets
sheets/                      Character animation PNG sheets
tools/                       Sprite generation utilities
ENVIRONMENT_THEME.md         Visual direction and environment plan
SPRITE_ANIMATION_RESEARCH.md Sprite animation research and production notes
```

## Validation

With the demo server running:

```bash
cd demo
npm run test:interaction
npm run test:environment-visual
```

The tests use Playwright with a local Chrome install to confirm the game reaches movement states like `run`, `sprint`, `jump`, and `dash`, and to capture an environment interaction screenshot.

## Notes

This is intentionally a prototype. The sprites and game logic were generated and iterated locally with visual feedback loops, then cleaned up so the published repo contains the final playable assets and source without raw temporary generation artifacts.
