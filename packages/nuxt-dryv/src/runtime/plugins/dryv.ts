import {
  Dryv,
  type DryvOptions,
  type DryvValidationResult,
  type DryvValidationRule,
  DryvValidationSession,
} from '@softwareproduction/dryvue'
import { invokeResultHandlers, addResultHandler } from '../composables/useResultHandlers'
import { defineNuxtPlugin, useRuntimeConfig, useState, reactive } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  const moduleOptions = useRuntimeConfig().public.dryv as {
    serverBaseUrl?: string
    clientBaseUrl?: string
    handleWarnings?: boolean
  }

  const baseUrl = import.meta.server
    ? moduleOptions.serverBaseUrl
    : moduleOptions.clientBaseUrl

  const options: DryvOptions = {
    async callServer(url: string, method: 'POST' | 'GET', data?: unknown) {
      return await $fetch(`${baseUrl ?? ''}${url}`, {
        method,
        headers: data
          ? { 'Content-Type': 'application/json' }
          : {},
        body: data ? JSON.stringify(data) : undefined,
      })
    },
    reactiveWrapper<TObject>(object: TObject): TObject {
      return reactive(object as object) as TObject
    },
    async handleResult<TModel extends object>(
      session: DryvValidationSession<TModel>,
      model: TModel,
      field: keyof TModel,
      rule: DryvValidationRule<TModel>,
      result: DryvValidationResult,
    ): Promise<DryvValidationResult> {
      const path = String(field)
      return await invokeResultHandlers(session, model, path, rule, result)
    },
  }

  // Register the built-in warning deduplication handler
  if (moduleOptions.handleWarnings !== false) {
    addResultHandler(useWarningResultHandler())
  }

  // Allow user plugins to configure setup/parseDate/format/etc.
  await nuxtApp.callHook('dryv:options', options)

  nuxtApp.vueApp.use<DryvOptions>(Dryv, options)
})

function useWarningResultHandler() {
  const state = useState<Record<string, Record<string, string>>>('dryvWarnings', () => ({}))

  return async function handleWarningResult<TModel extends object>(
    session: DryvValidationSession<TModel>,
    _model: TModel,
    path: string,
    _rule: DryvValidationRule<TModel>,
    result: DryvValidationResult,
  ): Promise<DryvValidationResult | undefined> {
    let prevWarnings = state.value[session.ruleSet.name]
    const prevHash = prevWarnings?.[path]

    if (!prevHash) {
      if (!result?.warningHash) {
        return result
      } else {
        if (!prevWarnings) {
          prevWarnings = {}
          state.value[session.ruleSet.name] = prevWarnings
        }
        prevWarnings[path] = result.warningHash
        return result
      }
    } else if (result?.warningHash) {
      if (prevHash === result.warningHash) {
        // Same warning as before -> treat as success
        return {
          hasWarnings: false,
          hasErrors: false,
          hasNewWarnings: false,
          warningHash: undefined,
          success: true,
          results: [],
        }
      } else {
        // Warning changed -> update
        prevWarnings![path] = result.warningHash
        return result
      }
    }

    return result
  }
}
