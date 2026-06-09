import type { DryvReactiveState } from '@/types'

/**
 * Resets the reactive validation state of a validator.
 * Pure function — operates on the reactive state object directly.
 *
 * @param reactive - The reactive state object to reset.
 * @param includeDirty - If `true`, also resets the `isDirty` flag.
 */
export function resetValidatorState(reactive: DryvReactiveState, includeDirty: boolean): void {
  reactive.type = null
  reactive.text = null
  reactive.group = null
  reactive.groupShown = false
  if (includeDirty) reactive.isDirty = false
}

/**
 * Walks a validator tree (self + all descendants) depth-first and invokes an action on each.
 * Accepts any node with a `childValidators()` method.
 *
 * @typeParam T - The validator node type.
 * @param root - The root node to start the walk from.
 * @param action - Callback invoked on each node.
 */
export function walkValidatorTree<T>(
  root: T & { childValidators(): T[] },
  action: (v: T) => void
): void {
  action(root)
  for (const child of (root as any).childValidators()) {
    walkValidatorTree(child as T & { childValidators(): T[] }, action)
  }
}
