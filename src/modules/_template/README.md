# Module recipe

Copy this folder to `src/modules/<id>/` and follow the steps in `CLAUDE.md` ("Adding a module").

```
src/modules/<id>/
  module.ts        export const <id>Module: ModuleDef = { id, name, icon, accent, order, routes, today }
  repo.ts          repository for the module's own tables (core tables go through core repos)
  today.ts         TodayContributor(s): return TodayCard[] (data, not JSX)
  screens/         React screens mounted under /m/<id>
  logic/           pure, unit-tested functions
```

Migration: `src/core/db/migrations/NNNN_<id>.ts` with `tables` (parent first) and `fixtures` (one full row per table), appended to `MIGRATIONS`. Then `npm run check` and `WRITE_GOLDEN=1 npx vitest run src/test/golden`.
