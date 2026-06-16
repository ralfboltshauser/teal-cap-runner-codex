# Environment Theme: Windmill Courier Meadow

## Visual Direction

The world should feel like a tiny courier route through a high meadow at late afternoon: warm soil, teal rooflines, copper signposts, soft blue hills, cream wildflowers, and small animated details that react to the player. The character already has a teal cap, navy vest, tan pants, and brown boots, so the environment should echo those colors with meadow greens, warm ochres, copper highlights, and teal accents.

The core fantasy: a cheerful little runner crossing a hillside path near old windmills and flower fields, where the ground and plants respond to his movement.

## Palette

- Sky: soft turquoise to green-blue haze.
- Distant hills: blue-green silhouettes, muted and low contrast.
- Ground: warm chestnut dirt with ochre top edge and darker embedded stones.
- Plants: sage and meadow green with cream, yellow, rose, and blue flowers.
- Effects: off-white dust, warm pebble highlights, small amber pollen pixels.

## Sprite Set

All environment sprites are generated as PNG sheets under:

```text
/home/ralf/prj/exploration/game-sprites/environment/
```

Sprites:

- `ground-tiles.png`: dirt platform tiles with grassy/meadow top edge.
- `flower-bounce.png`: 6-frame flower clump that bows, springs, and shakes when the player runs past.
- `grass-sway.png`: 6-frame grass tuft loop with gentle ambient wind.
- `bird-flock.png`: 6-frame small bird silhouette/flap cycle for parallax fly-bys.
- `stone-particles.png`: 8 small individual pebble sprites for landing bursts.
- `dust-puff.png`: 6-frame pale dust puff for dash/landing feedback.
- `meadow-props.png`: small non-interactive props: copper signpost, little windmill marker, mushrooms, and stones.
- `hills.png`: parallax background hill bands.

## Interactions

- Flowers trigger when the player passes within range. They bend away from the player, bounce, and release tiny pollen pixels.
- Grass sways continuously, with a slightly stronger bend near the player.
- Birds fly through the background on slow parallax arcs.
- Landing with enough downward velocity emits subtle stone particles and a dust puff.
- Dash emits a short dust puff trail.
- Ground tiles scroll visually across the platform and use the same warm palette as the original demo, but with more detail and a grass lip.

## Validation Rules

- Every sheet uses integer frame cells.
- Every frame must have transparent corners where applicable.
- No frame may contain fragments from neighboring cells.
- Sprites must be proportionate to the character:
  - Flower clump roughly knee height.
  - Grass tuft below shin height.
  - Birds small enough to read as background detail.
  - Pebbles tiny and subtle, never larger than the character's boot.
- The demo must render a full scene screenshot and run the existing interaction test after integration.
