# Teal Cap Runner Game Design Plan

## One-Line Direction

**Teal Cap Runner should become a cozy courier platformer about delivering tiny things across a living windmill meadow, where movement mastery makes the world bloom.**

This should not become a harsh endless runner or a generic Mario clone. The current character and meadow are cheerful, tactile, and reactive. The best fit is a short-session game that feels relaxing at first, then reveals expressive movement and route optimization for players who want mastery.

## Recommended Mode

### Primary Mode: Route-Based Cozy Skill Runs

The game should be **level-based**, with compact hand-authored courier routes that can be replayed for better flow.

Each route is a 45-90 second delivery path:

1. Pick up a parcel, seed pouch, note, ribbon, or windmill part.
2. Traverse a meadow route using run, sprint, jump, dash, crouch, and bounce interactions.
3. Deliver it to a character, mailbox, windmill marker, garden bed, or hilltop bell.
4. Receive a warm world reaction: flowers bloom, birds scatter, windmill spins, new shortcut opens.
5. Optional replay goals: faster delivery, all flowers awakened, no parcel bumps, hidden pickup found.

This gives the prototype a reason to move without making it stressful. It also uses the existing strengths: animation, tactile environment feedback, and a charming courier identity.

### Secondary Mode: Endless Meadow Post

After the first few routes, unlock a relaxed endless mode:

- Procedural or semi-random meadow chunks.
- Deliver as many parcels as possible before sunset.
- No hard fail at first; missed deliveries reduce combo or route rating.
- Good for quick play and replayability, but not the main identity.

### Why Not Pure Endless Runner?

Endless runners are easy to prototype, but they push the game toward reaction speed, obstacle density, and score pressure. This character/world feels more memorable if the player builds familiarity with places: the windmill hill, the flower lane, the brook jump, the mushroom tunnel, the evening bell.

## Design Pillars

### 1. Movement Should Feel Like a Toy

The player should enjoy running even when nothing is being collected. The current dash, jump, run, and sprint states are a good base. The next design work should make the character feel physically delightful:

- Coyote time and jump buffering.
- Variable jump height.
- Dash with a small cooldown and readable recovery.
- Slope/hill momentum later.
- Landing effects that scale with impact.
- Plants and dust reacting to speed.

### 2. The World Responds to Kindness and Speed

The meadow should feel alive but not noisy:

- Flowers bow when passed, bloom after deliveries, and release pollen at high speed.
- Birds fly away when you sprint nearby.
- Grass bends toward the dash wake.
- Pebbles pop only on hard landings.
- Windmill props spin after route completion.

The player is not destroying the world; they are waking it up.

### 3. Short Routes, Replayable Mastery

Routes should be small enough to learn, but expressive enough to optimize:

- Main path is forgiving.
- Fast path asks for a dash-jump, crouch slide, bounce, or timing.
- Hidden path asks for observation.
- Perfect path chains flow without forcing perfection.

### 4. Cozy Stakes, Clear Goals

The game should avoid death-heavy punishment. Failure should be soft:

- Drop parcel: lose a few seconds, not the level.
- Miss a jump: land on a lower path.
- Hit a puddle or bramble: stumble/recover, no instant fail.
- Timer grades are optional, not the only way to enjoy the route.

## Frameworks to Use

### MDA: Mechanics, Dynamics, Aesthetics

Use MDA to keep the game honest:

- **Mechanics:** sprint, jump, dash, crouch, parcel pickup, flower triggers, route gates, delivery targets.
- **Dynamics:** flow, optimization, recovery from mistakes, choosing safe route vs fast route, waking the meadow.
- **Aesthetics:** cozy competence, light adventure, discovery, tactile delight, “one more run.”

The important check: every new mechanic must create a useful dynamic and support the desired feeling. If a spike pit or enemy creates stress without supporting cozy courier mastery, it does not belong in the first version.

### Core Loop

The main loop should be:

```text
Accept delivery -> read route hint -> move through meadow -> trigger world feedback -> deliver -> world changes -> unlock/replay route
```

The 10-second loop should be:

```text
See small route feature -> choose move -> execute -> get juicy feedback -> adjust next move
```

The long-term loop should be:

```text
Unlock meadow areas -> learn shortcuts -> earn route badges -> restore windmill meadow -> collect route memories
```

### Kishotenketsu Route Structure

Borrow Nintendo-style four-beat level design:

1. **Introduce:** teach one idea safely, such as flower bounce or dash under a gate.
2. **Develop:** ask the player to use it while moving.
3. **Twist:** combine it with another move or a route choice.
4. **Conclusion:** give a satisfying delivery moment or scenic payoff.

Example route:

- Introduce dash through pollen flowers.
- Develop dash-jump over a shallow brook.
- Twist crouch-slide under a windmill beam into a flower bounce.
- Conclusion deliver a ribbon and make the windmill spin.

### Game Feel / Juice

The game needs “juice” everywhere, but restrained:

- Tiny screen shake on hard landing only.
- Dust puffs on dash, skid, and landing.
- Grass/flowers react with local timing.
- Audio later: footstep ticks, flower chimes, parcel bell, wind gust.
- Animation cancel rules should make controls feel responsive.

The rule: feedback should clarify player action, not cover up bad input feel.

## Games to Steal From Like an Artist

These are inspirations to transform, not copy directly.

### A Short Hike

Steal:

- Gentle exploration tone.
- Low-pressure traversal.
- Small world with memorable landmarks.
- Optional goals that make movement meaningful.

Transform:

- Replace climbing/gliding with courier platforming.
- Use compact side-view routes instead of 3D island wandering.
- Make deliveries change the meadow visually.

### Celeste

Steal:

- Crisp platformer controls.
- Dash as a readable movement verb.
- Assistive philosophy: precision can coexist with accessibility.
- Clear route readability.

Transform:

- Remove harsh difficulty as the core identity.
- Use dash for flow and shortcuts, not constant punishment.
- Make “perfect route” optional.

### Alto’s Adventure / Alto’s Odyssey

Steal:

- Calm endless movement mood.
- Beautiful silhouettes and ambient transitions.
- Trick/combo rhythm without aggressive UI.

Transform:

- Use endless mode as a secondary meadow delivery mode.
- Replace snowboarding tricks with courier flow chains: dash, jump, bloom, deliver.

### Tiny Wings

Steal:

- Momentum as pleasure.
- Terrain as a toy.
- Simple inputs creating expressive timing.

Transform:

- Later add soft hills and downhill sprint boosts.
- Use meadow slopes and wind gusts rather than bird flight.

### Sonic The Hedgehog

Steal:

- Speed lanes and route hierarchy.
- Momentum rewards.
- The feeling of learning a level and flowing through it.

Transform:

- Keep speed readable and cozy.
- Avoid camera chaos and unavoidable enemy hits.
- Use environment reactions instead of rings/enemies as the main feedback.

### Yoshi’s Island / Kirby

Steal:

- Handmade, soft, toy-like world.
- Friendly interactions.
- Collectibles that feel charming rather than transactional.

Transform:

- Use courier parcels, seed bundles, postcards, and flower stamps.
- Keep mechanics lighter and route-based.

### Spelunky / Daily Challenge Structure

Steal:

- Daily route seed for replay and shareability.
- Emergent small choices.

Transform:

- Make daily routes cozy and low-punishment.
- Use generated meadow chunks only after the hand-authored route language works.

## Core Mechanics

### Movement

Minimum next implementation:

- Walk/run/sprint using existing animations.
- Jump with coyote time and input buffering.
- Dash with cooldown, dust, and flower wake.
- Crouch slide under low gates.
- Skid when turning at high speed.

Later:

- Downhill speed boosts.
- Wall bump or ledge catch, only if it supports routes.
- Wind gusts that extend jumps.

### Delivery System

Add parcel objects:

- Pickup: player touches parcel stand.
- Carrying: small parcel icon attached to character/back or HUD.
- Condition: optional “careful delivery” rating if you avoid hard landings.
- Delivery: target mailbox, windmill marker, garden bed, or character.

Delivery feedback:

- Route complete card.
- Meadow element changes permanently for that route.
- Time/flower/parcel-care badges.

### Collectibles

Use collectibles as route texture, not clutter:

- Flower stamps: awaken all flowers on route.
- Lost buttons: hidden in alternate paths.
- Wind notes: placed along fast route.
- Pollen trail: teaches path rhythm.

Avoid coin spam. The world is more special if pickups are sparse and meaningful.

### Obstacles

Use soft obstacles first:

- Low windmill beams: crouch/slide.
- Shallow brooks: jump/dash-jump.
- Mud patches: slow unless sprint-jumped.
- Hay bales: bounce or hop.
- Bramble edges: stumble but no death.

Avoid enemies for v1. They shift the tone toward combat/avoidance.

### Interactive Environment

Already implemented:

- Flowers react.
- Grass sways.
- Birds fly.
- Dust and stones emit.

Next:

- Flower bloom state after route completion.
- Windmill spin animation when delivered.
- Mailbox flag pop.
- Bridge plank wobble.
- Bell ring particles.
- Butterflies attracted to awakened flowers.

## Route Types

### 1. Warm-Up Route: “Morning Ribbon”

Goal: deliver a ribbon to the windmill marker.

Teaches:

- Run, jump, flowers, delivery target.

Path:

- Flat meadow.
- One shallow brook.
- Three flower groups.
- Big visible endpoint.

Badge ideas:

- On Time.
- All Flowers Awake.
- Soft Landing.

### 2. Movement Route: “Parcel Over Pollen Lane”

Goal: deliver a parcel quickly.

Teaches:

- Sprint, dash, skid recovery.

Path:

- Long flower lane.
- Low beam requiring crouch.
- Optional upper path with faster delivery.

Badge ideas:

- No Stumble.
- Dash Chain.
- Fast Courier.

### 3. Discovery Route: “Button Under The Windmill”

Goal: find a lost button before delivery.

Teaches:

- Crouch path and route observation.

Path:

- Main delivery path is simple.
- Hidden low tunnel contains optional pickup.

Badge ideas:

- Found Button.
- Scenic Route.

### 4. Flow Route: “Sunset Mail Sprint”

Goal: deliver before the bell finishes.

Teaches:

- Combining sprint, dash-jump, flower bounce, and landing recovery.

Path:

- Slightly longer.
- Multiple route branches.
- Fastest path is satisfying but not required.

Badge ideas:

- Sunset Gold.
- No Parcel Bumps.
- Meadow Bloom.

## Progression

### First 15 Minutes

1. Start in Meadow Post.
2. Learn movement through a short no-fail route.
3. Deliver first item and see the windmill marker spin.
4. Unlock route board with 3 deliveries.
5. Unlock dash badge or courier satchel.

### Meta Progression

Keep it light:

- Route stamps on a postcard board.
- Meadow changes with completed deliveries.
- Cosmetic satchel ribbons.
- New routes and optional endless meadow mode.

No heavy inventory, crafting, or RPG systems yet.

## Scoring and Feedback

Use a warm route-complete card:

- Delivery time.
- Flowers awakened.
- Parcel care.
- Hidden find.
- Route stamp.

Grade labels should fit the tone:

- “Fresh”
- “Swift”
- “Wind-Kissed”
- “Meadow Perfect”

Avoid cold S/A/B ranking in the first version.

## Difficulty and Accessibility

Default:

- Forgiving platforms.
- Soft penalties.
- Optional mastery routes.

Settings:

- Auto-sprint toggle.
- Longer dash cooldown indicator.
- Reduced motion.
- Always show route arrow.
- No timer pressure mode.

## Implementation Roadmap

### Version 0.2: Make It a Game

Build one complete route:

- Start and delivery target.
- One parcel.
- Route completion screen.
- Timer and flower-awake count.
- Coyote time and jump buffer.
- Camera follows player across a route wider than the screen.
- Restart route key.

Success criteria:

- A player can finish a route.
- It has a clear goal.
- It feels good to replay once.

### Version 0.3: Route Depth

Add:

- Crouch gates.
- Dash flowers or bounce pads.
- Optional upper/lower path.
- Parcel care.
- Three badges.

Success criteria:

- Main route is easy.
- Fast route is satisfying.
- Player can describe what they would improve on a replay.

### Version 0.4: Living Meadow

Add:

- Persistent route completion changes.
- Windmill spin, mailbox flag, bloom states.
- Ambient sound plan or simple Web Audio.
- Route-select board.

Success criteria:

- Deliveries visibly improve the world.
- The meadow feels like a place, not a test room.

### Version 0.5: Endless Meadow Post

Add:

- Chunk-based endless mode.
- Daily seed.
- Gentle score based on deliveries, flowers, and flow.

Success criteria:

- Endless mode is fun for 2-3 minutes without replacing hand-authored routes.

## What to Build Next

The next coding step should be **Version 0.2: Morning Ribbon**.

Concrete tasks:

1. Change the current arena into a horizontally scrolling route about 3 screens wide.
2. Add a parcel pickup at the start.
3. Add a delivery target near the end.
4. Add a route-complete overlay.
5. Add coyote time and jump buffering.
6. Add flower count and timer.
7. Add one optional shortcut that uses dash-jump.

This will convert the prototype from “a nice movement toy” into “a small game.”

## References

- Hunicke, LeBlanc, and Zubek’s MDA framework: http://www.cs.northwestern.edu/~hunicke/MDA.pdf
- Unity’s article on core loops and player retention: https://unity.com/how-to/build-a-game-core-loop
- Nintendo/Kishotenketsu level structure discussion: https://www.gamedeveloper.com/design/the-structure-of-fun-learning-from-super-mario-3d-land-s-director
- Game feel and juice talk “Juice it or lose it”: https://www.youtube.com/watch?v=Fy0aCDmgnxg
- Celeste accessibility and Assist Mode discussion: https://www.celestegame.com/accessibility.html
- A Short Hike official site for tone/reference: https://ashorthike.com/
- Alto’s Adventure official site for relaxing endless movement reference: https://www.altosadventure.com/
- Tiny Wings official site for one-touch momentum inspiration: https://www.tinywings.de/
