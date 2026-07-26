# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Đại chiến Khôi Nguyên** — a browser tower-defense/Age-of-War game (Phaser 3 + TypeScript + Vite), deployed to GitHub Pages as a PWA. Two factions **Khôi** (left) vs **Nguyên** (right); player picks one, AI plays the other. UI text and code comments are in Vietnamese.

## Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc --noEmit (type-check src only) + vite build → dist/
npm test         # runs test/simulation.test.ts via tsx (Node, no browser)
```

- **Tests are one file** (`test/simulation.test.ts`), a flat list of `check('name', () => {...})` blocks that `console.log`/`assert` and throw on failure. To run "a single test", temporarily comment out other `check(...)` calls or add a guard — there is no test filter flag.
- `npm run build` type-checks **`src` only** (tsconfig `include: ["src"]`); the test file's types are validated by `tsx` at `npm test` time. Run both before considering work done.
- **`tsconfig` is strict** with `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns` → a leftover import or param **fails the build**. Prefer `import type` for type-only imports (`isolatedModules` is on).

## Architecture (the parts that span files)

### `src/config/game-config.ts` is the single source of truth
Every gameplay number (unit stats, costs, cooldowns, base HP, roof attacks, difficulty/stage multipliers, upgrade curves, hero definitions) lives here — comments call it "NGUỒN CHÂN LÝ". **Balance changes go here, not in the systems.** Systems read from it; they don't hardcode numbers.

### Battle loop orchestration (`src/scenes/battle-scene.ts`)
`update()` runs subsystems in a fixed order each frame — **order matters**: `economy → ai → updateBattle (combat) → roofs → updateProjectiles → hud`. Dead-unit cleanup + bounty payout happen inside `updateBattle`. `systems/` are plain functions/classes operating on shared arrays (`units`, `projectiles`) and a `Record<Side, Base>`; entities (`unit`, `base`, `roof-attacker`, `projectile`) own their own Phaser display objects.

### Stat-modifier system (`SideMods` + `computePlayerMods`)
Both sides are scaled by a `SideMods` object (per-unit-type hp/dmg/cost/spawn-cd, plus baseHp/roof/income). The **player's** mods come from permanent meta-upgrades bought with "xu" (`systems/meta-upgrades.ts` → `computePlayerMods`, persisted in `localStorage`). The **AI's** mods come from difficulty × stage via `uniformSideMods`. Spawn cost, unit HP/damage, base HP, roof damage — all flow through these multipliers, so never bypass them.

### Hero system is a registry (`HEROES` / `HeroDef` in game-config)
Each faction has one optional hero (Khôi=Sumo, Nguyên=Labubu) with **identical behavior/stats** — only avatar, cry SFX, and side differ. Adding a hero = one entry in `HEROES` + a cutout asset + a synth SFX. Key pieces: `heroForSide` / `heroDefByType` (lookup), `updateHero` in `systems/hero-behavior.ts` (charge/retreat/heal state machine, shared by all heroes), `systems/hero-shop.ts` (`usableHero(side)` gates the in-battle spawn button; `isHeroUnlocked`/`unlockHero`). Hero upgrades are a **separate list** from `META_UPGRADES` (so they don't appear in the normal upgrade shop) but use the same `localStorage` store and `buyUpgrade` machinery. **The AI never spawns heroes** (they're not in `SPAWN_ORDER`).

### Coordinate model
Single lane at `LANE_Y`; units are effectively 1-D along X. `directionOf(side)` is `+1` for Khôi (moves left→right) and `-1` for Nguyên. Targeting is nearest-by-absolute-X. A unit's `isTargetable()` returns false while a hero is healing behind its own base — every targeting scan (combat, projectiles, roof) must respect it.

### Audio is fully synthesized (`src/audio/sound-manager.ts`)
**No audio files** — all SFX and music are generated with the Web Audio API (keeps the build offline-capable and light). Adding a sound = adding a case + a private synth method; `Sfx` is a string-literal union. In Node/tests there's no `window`, so `sound.play()` is a safe no-op.

### Persistence & tests
`localStorage` keys: `dckn-coins`, `dckn-meta` (upgrade/hero levels), plus campaign progress. `meta-upgrades.ts` falls back to in-memory vars when `localStorage` is unavailable. `simulation.test.ts` builds **real** `Base`/`Unit`/systems against a hand-stubbed Phaser scene (`makeGO()` returns a chainable no-op game object) and steps deterministic frames via `pump()` — no browser, no `requestAnimationFrame`. New gameplay logic should be covered the same way.

## Conventions & gotchas

- Keep code files under ~200 lines; split into focused modules (this is why `ui/upgrade-row.ts`, `systems/hero-behavior.ts`, `systems/hero-shop.ts` exist).
- `combat.ts` ↔ `hero-behavior.ts` have an **intentional circular import** (function-level only — safe because neither symbol is used at module-init). Don't reference the imported symbol at top level in either file.
- Adding a `UnitType` requires updating every exhaustive `Record<UnitType, …>` (`UNITS`, `UNIT_EMOJI`, `unitRecord`, `ALL_UNIT_TYPES`) or mods become `NaN`; `tsc` catches the record literals.
- **Deploy:** GitHub Actions (`.github/workflows/deploy-pages.yml`) builds + deploys on push to `main`. `vite.config.ts` `base` must equal `/<repo-name>/` (currently `/dai-chien-khoi-nguyen/`); switch to `/` for a custom/user-page domain.
- iOS/PWA: `main.ts` refreshes `game.scale` on `orientationchange`/`resize` (Safari reports stale sizes after rotate); `#game` is anchored with `position:fixed`/`dvh` in `index.html`.
