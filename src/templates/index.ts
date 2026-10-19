import type { TemplateId } from '../core/types'
import { declaration } from './declaration'
import { gradient } from './gradient'
import { minimal } from './minimal'
import { poster } from './poster'
import type { Template } from './shared'

export const TEMPLATES: Record<TemplateId, Template> = { declaration, minimal, gradient, poster }
export const TEMPLATE_ORDER = Object.keys(TEMPLATES) as TemplateId[]
