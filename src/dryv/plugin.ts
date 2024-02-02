import type { App } from 'vue'
import type { Plugin } from '@vue/runtime-core'
import { reactive } from 'vue'
import type { DryvOptions, DryvValidationRuleSet } from './types'
import { defaultDryvOptions, defaultDryvRuleSetResolvers } from './config'

export const Dryv: Plugin<DryvOptions[]> = {
  install(_: App, ...options: DryvOptions[]) {
    Object.assign(
      defaultDryvOptions,
      {
        objectWrapper: (o: any) => reactive(o)
      },
      ...options
    )
  }
}

export interface DryvStaticRuleSetsOptions {
  [key: string]: DryvValidationRuleSet<any>
}

export const DryvStaticRuleSets: Plugin<DryvStaticRuleSetsOptions> = {
  install(app: App, options?: DryvStaticRuleSetsOptions) {
    const ruleSets: DryvStaticRuleSetsOptions = options
      ? Object.entries(options).reduce((acc, [key, value]) => {
          acc[key.toLowerCase()] = value
          return acc
        }, {} as DryvStaticRuleSetsOptions)
      : {}

    defaultDryvRuleSetResolvers.push({
      name: 'Static rule set resolver',
      resolve<TModel extends object, TParameters = object>(
        ruleSetName: string
      ): DryvValidationRuleSet<TModel, TParameters> {
        return ruleSets[ruleSetName.toLowerCase()] as DryvValidationRuleSet<TModel, TParameters>
      }
    })
  }
}
