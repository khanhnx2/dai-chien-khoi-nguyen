# Review: Zombie rage cooldown/shield + poison puddle (uncommitted diff)

Build (`npm run build`) and tests (`npm test`, 62/62) both pass.

## Findings (most severe first)

### Medium — poisoned unit can act one extra frame after hp hits 0
`src/systems/combat.ts:62-75`. Loop order per unit: `isDead()` check (top) → shield trigger →
poison tick (`unit.takeDamage(unit.poisonDps * dtSeconds)`) → `stunnedUntil` check → move/attack.
If the poison tick drops a unit's hp to 0 *this frame*, there's no re-check of `isDead()` before
falling through to the move/attack block below — the now-dead unit still gets to move or land an
attack (dealing real damage to its target) before being spliced out in the end-of-function cleanup
loop. Only affects player-side units (only side that gets poisoned) attacking non-poisoned
opponents, so impact is cosmetic/minor fairness, not a crash. Fix: add
`if (unit.isDead()) continue;` right after the poison-tick line.

### Low — invincibility can lag by one frame depending on unit array order
Not a bug per se, inherent to single-pass simulation: if the unit array order has the zombie
processed *before* the attacker that pushes its hp ≤50% within the same frame, the shield won't
trigger until the zombie's next frame iteration (~16ms later at 60fps). Confirmed intentional
side effect of a sequential loop, not worth fixing — flagging only because it's a real (if
negligible) timing edge case the task description asked about.

### Verified correct (no action needed)
- **Shield choke point**: grepped every `.takeDamage(` call site (`projectile-system.ts` x4,
  `titan-behavior.ts`, `hero-behavior.ts`, `special-ability.ts`, `combat.ts`) — all route through
  `Unit.takeDamage()`, so the `if (this.invincible) return;` early-return in
  `src/entities/unit.ts:166` is a true single choke point. Confirmed piercing Father bolts fired
  *before* the shield activates still get blocked if they land during the 1s window, since
  `invincible` is read live at damage-application time in `projectile-system.ts`'s `pierceThrough`,
  not cached at fire time.
- **`invincible` recompute cadence**: `combat.ts:70` recomputes `unit.invincible = now <
  unit.invincibleUntil` every frame inside the per-unit loop (zombie-only branch), so it correctly
  flips back to `false` once `invincibleUntil` passes — verified by test 59.
- **No object pooling / stale instance reuse**: grepped `new Unit(` — only `spawn.ts` constructs
  units, always via `new`; no pool. `invincibleUntil`/`shieldTriggered`/`poisonUntil`/`poisonDps`
  can't leak across waves since every unit is a fresh instance with class-field defaults.
- **Poison tick ordering**: happens before the `stunnedUntil` continue, so poisoned units keep
  ticking while stunned (matches design comment) and stop ticking correctly once `isDead()` is
  true from a *prior* frame (top-of-loop guard). `poisonDps * dtSeconds` can't double-apply within
  a frame — it's a single conditional call per unit per frame.
- **`PoisonPuddleManager`**: `dps = damage / (ZOMBIE_PUDDLE_DURATION_MS / 1000)` math is correct
  (total damage over 5s). Expired puddles are spliced + `visual.destroy()`'d every frame in
  `update()`, so no unbounded accumulation outside of `endGame`. `destroyAll()` wired into
  `battle-scene.ts:235` (`endGame`) prevents circle-graphic leaks across battles. Radius check
  (`Math.abs(unit.x - puddle.x) <= ZOMBIE_PUDDLE_RADIUS`) and "already poisoned → skip" gate both
  match spec (no stacking/refresh).
- **Test coverage**: tests 58-62 exercise the *real* integration path — they call the actual
  `updateBattle()` (combat.ts) and `PoisonPuddleManager` directly, not mocks; test 60 verifies the
  `onZombieDeath` callback receives base (non-raged) damage exactly once. The one gap: no test
  exercises `battle-scene.ts`'s own wiring (the `updateBattle(...) → poisonPuddles.spawnBurst`
  callback closure, and the `poisonPuddles.update()` call placement in the frame loop) since that
  file isn't reachable from `simulation.test.ts`'s headless harness — this is a pre-existing
  structural gap (same as all other `battle-scene.ts` wiring), not new to this diff.
- Import additions in `game-config.ts`/`combat.ts`/`battle-scene.ts` are all used; no unused-import
  build failures (confirmed via successful `npm run build`).

## Unresolved questions
None — all items in the review scope were verifiable directly from the diff and codebase.
