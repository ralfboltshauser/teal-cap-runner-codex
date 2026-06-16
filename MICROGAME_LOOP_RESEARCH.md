# Microgame Loop Research Notes

The next loop is built around a short-session arcade structure rather than a one-off route.

## Research Takeaways

- WarioWare-style microgames work because each challenge has a tiny fiction, a clear goal, and immediate agency. Game Studies describes WarioWare stages as rapid series of roughly five-second microgames, each with a simple goal and input verb: https://www.gamestudies.org/0501/gingold/
- Strong core loops repeat a small set of actions, then vary context and feedback so the player can build skill. GameAnalytics frames the core loop as the repeated foundation that all actions, rewards, and outcomes come from: https://www.gameanalytics.com/blog/how-to-perfect-your-games-core-loop
- Short-session mastery depends on feedback. Amy Jo Kim describes learning loops as activity plus feedback that lets the player improve toward mastery: https://amyjokim.medium.com/got-churn-tune-up-your-learning-loop-e2e1c3a5cdb2
- Risk and reward should be readable. A failed risky action should feel like the player's choice, not an unclear rule. This is why the duck gate now lets the player enter, stop, and intentionally crawl through instead of punishing a confusing collision.
- Difficulty should ramp inside the loop. WarioWare increases difficulty through level-ups and speed-ups; this game now ramps route difficulty through repeated timed deliveries.

## Applied Design

- Session: a timed Morning Rush run, defaulting to 120 seconds.
- Micro loop: pick up, read the next obstacle, execute one clean input, get immediate feedback, deliver, repeat.
- Skill verbs: run, crouch-crawl, jump timing, dash timing, route recovery.
- Feedback: score, combo, deliveries, mistakes, clean-drop hints, final stamp.
- Challenge ramp: every two deliveries increases route difficulty and shifts obstacle spacing.
- Failure design: splashing the brook breaks combo; bumping the duck gate teaches the correct move without counting as a mistake.
