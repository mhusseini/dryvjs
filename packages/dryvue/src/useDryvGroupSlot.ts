import { type VNode, computed, useSlots, type VNodeChild, isVNode } from 'vue'
import type { DryvGroupValidationResult, DryvValidationResultType } from 'dryvjs'
import { type Ref } from '@vue/reactivity'
import { DryvValidator } from 'dryvjs'

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
    const children = nodes.map((n) => getAllVNodes(n)).flat()
    children.forEach((node) => {
      const validatable = node.props?.modelValue

      if (!(validatable instanceof DryvValidator)) {
        return
      }

      validatable.groupShown = false

      if (
        !validatable.group ||
        !validatable.type ||
        (groupNames && groupNames.indexOf(validatable.group) < 0)
      ) {
        return
      }

      let group = groups[validatable.group]
      if (!group) {
        group = {}
        groups[validatable.group] = group
      }

      let texts = group[validatable.type]
      if (!texts) {
        texts = []
        group[validatable.type] = texts
      }

      if (texts.indexOf(validatable.text) < 0) {
        texts.push(validatable.text)
      }

      validatable.groupShown = true
    })

    return Object.entries(groups).map(([name, group]) => {
      return {
        name: name,
        results: Object.entries(group).map(([type, texts]) => ({
          type: type as DryvValidationResultType,
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

function getAllVNodes(vnode: VNode): VNode[] {
  const vnodes: VNode[] = []

  function traverse(node: VNodeChild) {
    if (Array.isArray(node)) {
      for (const child of node) {
        traverse(child)
      }
    } else if (isVNode(node)) {
      vnodes.push(node)

      const dynamicChildren = (node as any).dynamicChildren
      if (dynamicChildren && dynamicChildren.length > 0) {
        for (const child of dynamicChildren) {
          traverse(child)
        }
      } else {
        const { children } = node

        if (Array.isArray(children)) {
          for (const child of children) {
            traverse(child)
          }
        } else if (typeof children === 'object' && children !== null) {
          for (const key in children) {
            const slot = children[key]
            if (typeof slot === 'function') {
              const slotContent = slot({})
              traverse(slotContent)
            }
          }
        }
      }
    }
  }

  traverse(vnode)

  return vnodes
}
