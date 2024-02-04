import { VNode, computed, useSlots } from 'vue'
import {
  DryvGroupValidationResult,
  DryvValidatable,
  DryvValidationResultStatus,
  isDryvValidatable
} from 'dryvjs'
import { Ref } from '@vue/reactivity'

export function useDryvGroupSlot(): Ref<DryvGroupValidationResult[]>
export function useDryvGroupSlot(groupNames: string[]): Ref<DryvGroupValidationResult[]>
export function useDryvGroupSlot(
  slotName: string,
  groupNames?: string[] | undefined
): Ref<DryvGroupValidationResult[]>
export function useDryvGroupSlot(
  slot: VNode[],
  groupNames?: string[] | undefined
): Ref<DryvGroupValidationResult[]>
export function useDryvGroupSlot(
  slotOrGroupNames?: string | VNode[] | undefined | string[],
  groupNames?: string[] | undefined
): Ref<DryvGroupValidationResult[]> {
  let slot: string | VNode[] | undefined

  if (!groupNames && Array.isArray(slotOrGroupNames)) {
    groupNames = slotOrGroupNames as string[]
    slot = undefined
  } else {
    slot = slotOrGroupNames as string | VNode[] | undefined
  }

  if (groupNames?.length === 0) {
    groupNames = undefined
  }

  const nodes = useSlot(slot)

  return computed<DryvGroupValidationResult[]>(() => {
    const groups: Record<string, Record<string, any>> = {}
    nodes.forEach((node) => {
      const validatable: DryvValidatable = node.props?.modelValue

      if (!isDryvValidatable(validatable)) {
        return
      }

      validatable.groupShown = false

      if (
        !validatable.group ||
        !validatable.status ||
        (groupNames && groupNames.indexOf(validatable.group) < 0)
      ) {
        return
      }

      let group = groups[validatable.group]
      if (!group) {
        group = {}
        groups[validatable.group] = group
      }

      let texts = group[validatable.status]
      if (!texts) {
        texts = []
        group[validatable.status] = texts
      }

      if (texts.indexOf(validatable.text) < 0) {
        texts.push(validatable.text)
      }

      validatable.groupShown = true
    })

    return Object.entries(groups).map(([name, group]) => {
      return {
        name: name,
        results: Object.entries(group).map(([status, texts]) => ({
          status: status as DryvValidationResultStatus,
          texts: texts as string[]
        }))
      }
    })
  })
}

function useSlot(slot: string | VNode[] | undefined): VNode[] {
  if (!slot) {
    return useDefaultSlot()
  } else if (typeof slot === 'string') {
    return useNamedSlot(slot)
  } else {
    return slot
  }
}

function useDefaultSlot(): VNode[] {
  const defaultSlot = useSlots().default

  if (typeof defaultSlot !== 'function') {
    throw new Error('Could not find a default slot.')
  }

  return defaultSlot()
}

function useNamedSlot(name: string): VNode[] {
  const namedSlot = useSlots()[name]

  if (typeof namedSlot !== 'function') {
    throw new Error(`Could not find a slot named '${name}'.`)
  }

  return namedSlot()
}
