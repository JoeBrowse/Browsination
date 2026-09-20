import type { ModuleDef } from '@/core/modules/types'
import { brainModule } from './brain/module'

/**
 * Static module list. Each stage adds one import + one entry here; nothing else in core changes.
 * See src/modules/_template for the recipe.
 */
export const MODULES: ModuleDef[] = [brainModule]
