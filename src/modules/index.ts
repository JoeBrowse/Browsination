import type { ModuleDef } from '@/core/modules/types'
import { alcoholModule } from './alcohol/module'
import { banjoModule } from './banjo/module'
import { brainModule } from './brain/module'
import { chessModule } from './chess/module'
import { lifeModule } from './life/module'
import { snookerModule } from './snooker/module'

/**
 * Static module list. Each stage adds one import + one entry here; nothing else in core changes.
 * See src/modules/_template for the recipe.
 */
export const MODULES: ModuleDef[] = [brainModule, lifeModule, chessModule, banjoModule, snookerModule, alcoholModule]
