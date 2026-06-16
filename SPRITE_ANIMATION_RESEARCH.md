# Sprite Animation Research And Production Plan

## Goal

Create a compact, game-ready animation set for the existing right-facing pixel-art playable character, then use those assets in a small playable browser demo. Every generated animation should use the current base sprite as the character reference so the outfit, proportions, palette, and silhouette stay coherent.

Base sprite:

- `running-little-man-transparent.png`
- Source chroma image: `running-little-man-source-chroma.png`

## Research Summary

### What Makes The Sprite Set Work In-Game

- Use short looping cycles. Pixel-art game animation usually depends on compact loops where every pixel change is visible; small inconsistencies repeat constantly and become obvious.
- Use strong key poses first. A run or walk cycle reads from contact, passing, push-off, and airborne/extreme poses; extra in-betweens only help after those poses work.
- Keep appendage thickness, head size, torso size, and costume landmarks consistent. In small pixel sprites, one or two pixels of drift can make the character feel like a different drawing.
- Keep a stable pivot/anchor. All frames need the same canvas size and the same foot/hip reference point, otherwise the character jitters during playback.
- Preserve pixel crispness. For pixel art in engines, use point/nearest-neighbor filtering, no texture compression, and integer or pixel-perfect scaling where possible.
- Prefer per-animation timing over one global speed. Idle can be slow, run needs faster cycling, jump/fall often uses held frames, dash can be very fast with a short smear/extreme frame.
- Avoid trimming frames unless metadata preserves the original source rectangle and pivot. Trimmed sprites are fine in production atlases only when the renderer uses frame metadata correctly.
- Add padding/extrusion around atlas frames when rendering from atlases to avoid edge bleeding, especially if the sprite is scaled or sampled by GPU texture coordinates.

### Practical Frame Counts

These are deliberately modest so the set is achievable and readable:

| State | Frames | Playback | Loop | Notes |
| --- | ---: | ---: | --- | --- |
| idle | 4 | 4-6 fps | yes | Subtle breathing/blink/weight shift; feet stay planted. |
| walk | 6 | 8-10 fps | yes | One foot always grounded; slower stride than run. |
| run | 8 | 10-12 fps | yes | Stronger lean, arm swing, brief airborne feeling. |
| sprint | 6 | 12-14 fps | yes | Lower forward lean, longer stride, faster than run. |
| jump | 5 | variable | no/held | crouch/anticipation, takeoff, rise, apex, fall/landing. |
| crouch | 3 | 8-10 fps | no/held | Down transition, crouched hold, up transition. |
| dash | 4 | 14-18 fps | no | Anticipation, stretched/smeared burst, follow-through. |
| skid/turn | 4 | 10-12 fps | no | Useful when changing direction at speed. |

For the first playable demo, the minimum useful set is idle, walk, run, jump/fall, crouch, dash. Sprint and skid/turn are high-value second-pass states if time or generation quality allows.

### Animation Timing Principles

- Movement speed and animation rate should be related but not identical. The run cycle should speed up with horizontal velocity, within a clamp, so slow movement does not show sprint legs.
- Use variable frame durations for non-looping actions: anticipation and recovery frames last longer, the action/extreme frame lasts shorter.
- Jump is not a single loop. It should be stateful: takeoff -> rising hold -> apex/fall hold -> landing/recover. In a simple web demo, the vertical velocity can choose `jump-rise`, `jump-fall`, or `landing`.
- Dash should temporarily override normal locomotion animation, then return to the state implied by grounded/airborne/input.
- Idle should have a base loop plus optional occasional blink/weight-shift variants later. Do not trigger a long idle flourish immediately on entering idle.

### State-Machine Shape

Use gameplay facts as inputs:

- `grounded`
- `vx`
- `vy`
- `inputX`
- `inputDown`
- `dashRequested`
- `dashTimer`
- `jumpPressed`
- `facing`

Recommended priority order:

1. `dash`, while dash timer is active.
2. `crouch`, when grounded and down is held.
3. `jumpRise` or `jumpFall`, when airborne.
4. `sprint`, when grounded and run modifier is held with enough horizontal speed.
5. `run`, when grounded and speed is above run threshold.
6. `walk`, when grounded and speed is above walk threshold.
7. `idle`, otherwise.

Facing direction should be a render transform, not a separate duplicated animation set for the first pass. Generate right-facing sprites, then flip horizontally for left movement.

### Sprite Sheet Format For This Project

For AI-generated assets, the most reliable format is one sheet per state:

- PNG with alpha.
- Fixed grid, equal frame cells.
- Same number of columns as frames, one row per animation.
- Same visual scale across all sheets.
- Character centered around a consistent foot pivot.
- No shadows, outlines outside the intended sprite, text, grid labels, frame numbers, or UI.

Because the generation tool does not produce native transparent images directly, generate on a solid chroma-key background, then remove it locally. The character must not contain the key color.

Recommended project file layout:

```text
/home/ralf/prj/exploration/game-sprites/
  running-little-man-transparent.png
  animation-plan.json
  sheets/
    idle.png
    walk.png
    run.png
    jump.png
    crouch.png
    dash.png
  source/
    idle-chroma.png
    walk-chroma.png
    run-chroma.png
    jump-chroma.png
    crouch-chroma.png
    dash-chroma.png
  demo/
    index.html
    styles.css
    app.js
```

### Web Demo Requirements

- Use `<canvas>` and `requestAnimationFrame`.
- Use nearest-neighbor rendering: `ctx.imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`.
- Use a fixed time step or delta-time movement with animation frame advancement based on accumulated elapsed time.
- Store each animation as frames with `x`, `y`, `w`, `h`, and duration, even if the first implementation uses an equal grid. This leaves room for better atlas packing later.
- Show debug state, velocity, frame index, and controls in a compact overlay.
- Controls:
  - Left/right: move.
  - Shift: sprint.
  - Space/W/Up: jump.
  - Down/S: crouch.
  - X/J: dash.
- Physics:
  - Acceleration/deceleration, gravity, max speed, jump impulse.
  - Ground collision against a simple platform.
  - Dash timer and cooldown.

## Generation Prompt Rules

Every animation generation prompt should include:

- Use the existing base sprite as the exact character reference.
- Same teal cap, navy vest, cream shirt, tan pants, brown boots, gloves, face shape, proportions, and pixel-art style.
- Right-facing side-view platformer sprite.
- Fixed equal frame cells in a horizontal sprite sheet.
- Uniform chroma-key background for removal.
- No labels, no frame numbers, no shadows, no floor, no camera angle changes.
- Keep the feet/pelvis aligned to a consistent baseline across frames.

## Sources

- Unity animation state machines describe character animation as states plus transitions, with typical states including idle, walk, run, and jump: https://docs.unity3d.com/Manual/AnimationStateMachines.html
- Godot uses `AnimationTree` and `AnimationNodeStateMachine` for graph-based animation state playback: https://docs.godotengine.org/en/latest/tutorials/animation/animation_tree.html and https://docs.godotengine.org/en/stable/classes/class_animationnodestatemachine.html
- Unity Pixel Perfect documentation recommends consistent Pixels Per Unit, Point filtering, and no compression for crisp pixel sprites: https://docs.unity3d.com/Packages/com.unity.2d.pixel-perfect@2.0/manual/index.html
- Aseprite sprite-sheet export supports visible layers, frame tags, and texture atlases: https://www.aseprite.org/docs/sprite-sheet/
- LibGDX's 2D animation docs define animation as sequential frames shown at set intervals and show a running-man cycle as the core pattern: https://libgdx.com/wiki/graphics/2d/2d-animation
- SLYNYRD's pixel animation guide emphasizes short loops and the visibility of repeated pixel errors in game-style pixel animation: https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation
- SLYNYRD's character animation notes highlight consistency of limb thickness and length, where a single pixel can change the perceived form: https://www.slynyrd.com/blog/2025/3/24/pixelblog-55-top-down-character-animation
- OpenGameArt platformer examples show a practical production set with stance, run, walk, duck, and jump/fall animations and common frame counts: https://opengameart.org/content/platformer-animations
- TexturePacker documentation covers texture atlas packing settings relevant to padding and data export: https://www.codeandweb.com/texturepacker/documentation/texture-settings
- GameDev StackExchange discussion summarizes a useful implementation model: an animation is frames as rectangles plus per-frame duration: https://gamedev.stackexchange.com/questions/1434/sprite-animation-best-practices
