import { createApp, type App } from 'vue'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvjs'
import { Dryv } from '../plugin'

export interface SimpleModel {
  name: string
  email: string
}

export function createRuleSet<TModel extends object>(
  partial: Partial<DryvValidationRuleSet<TModel>> = {}
): DryvValidationRuleSet<TModel> {
  return {
    name: partial.name ?? 'testRuleSet',
    validators: partial.validators ?? ({} as any),
    disablers: partial.disablers,
    parameters: partial.parameters
  }
}

export function withApp(fn: (app: App) => void) {
  const app = createApp({ template: '<div />' })
  app.use(Dryv)
  fn(app)
  app.unmount()
}
