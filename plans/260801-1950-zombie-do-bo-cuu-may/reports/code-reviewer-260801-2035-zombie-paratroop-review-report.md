# Code Review: Zombie paratroop reinforcement (uncommitted)

## Verdict: Clean. No blocking issues.

## Checked (all confirmed correct, cite file:line)

1. **Trigger/timing** — `src/systems/zombie-drop.ts:37-55`
   - No double-fire: `justTriggered` set once inside `!this.triggered` block; `nextDropAt=now` on trigger frame so first drop fires same call and returns `'start'` (not `'drop'`).
   - Cutoff exact: `waveEndAt = now + 10000`; drops at now=0,1000,...,9000 (10 drops, since `nextDropAt += interval` avoids drift) — 11th would need now=10000 but `now >= waveEndAt` guards first, so exactly 10×10=100 max. Matches spec/tests.
   - No retrigger: once `triggered=true`, the `if (!this.triggered)` block is permanently skipped; after `waveEndAt` passes, `return false` forever.
   - Minor (informational, not a bug): drop count only advances by one interval per `update()` call — under a large single-frame stall (e.g. tab backgrounded near wave end) fewer than 100 total could spawn since it doesn't catch up multiple missed intervals in one frame. Acceptable degradation, same tradeoff class as other frame-driven timers in this codebase (`reinforcements.ts` has no interval-catchup either).

2. **Independence from `ReinforcementManager`** — confirmed `src/systems/reinforcements.ts` not in diff (not modified). `zombie-drop.ts` holds its own private state (`triggered/waveEndAt/nextDropAt`), no shared mutable state with `ReinforcementManager`. Both read `bases[aiSide]` read-only in `battle-scene.ts:174-185`; coexist safely in the same `update()`.

3. **`forceSpawnAt` bypass** — `src/systems/spawn.ts:91-97` mirrors `forceSpawn` (gold/cap/cooldown bypass intentional, matches existing pattern). Grepped call sites: only `src/systems/zombie-drop.ts:53` calls it — not reachable from player-controlled code paths.

4. **`unit.ts` parachute** — `src/entities/unit.ts:95-99`: gated by `type === UnitType.Zombie` inside the existing `if (drop)` block, so Titan drop (Capibara/Totoro) unaffected. Uses `scene.add.circle` (verified test stub scene at `test/simulation.test.ts:101` provides `circle:`, not `arc`) — no crash risk. Parachute destroyed via tween `onComplete`, positioned/tweened independently of `this.disc/icon/hpBar/hpText` array — no leak, no interference with other part positions.

5. **Exhaustive records** — `Zombie` added to `ALL_UNIT_TYPES`, `unitRecord`, `UNIT_EMOJI`, `UNITS` (`src/config/game-config.ts`). Grepped `COUNTERS` (`game-config.ts:251-255`): only BoBinh/CungThu/GiapBinh present — Zombie correctly excluded, consistent with Sumo/Labubu/Capibara/Totoro (heroes/titans also excluded).

6. **`showToast` DRY refactor** — `battle-scene.ts:199` generic signature `(text, color)`; only prior call site (reinforcement toast, was `showReinforceToast()`) updated at `battle-scene.ts:177` with matching text `'⚔️ QUÂN TIẾP VIỆN!'` / color `'#ef4444'` (identical to pre-refactor values). Grepped repo-wide: no other reference to `showReinforceToast`.

7. No unused imports / type issues spotted in diff; build+tests already reported green, not rerun per instructions.

## Unresolved questions
None.
