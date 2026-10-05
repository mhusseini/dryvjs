import type { DryvValidator } from './DryvValidator'
import { computeValidatorPaths } from '@/internal/computeValidatorPaths'

/**
 * Computes the hierarchy values (rootModel, rootValidator, path, uniquePath)
 * for a validator node given its parent context.
 *
 * @param parent - The parent validator, or `null`/`undefined` for the root.
 * @param model - The model object this node is bound to.
 * @param self - The validator node itself.
 * @param field - The field name or property key of this node.
 * @param index - The array index of this node (for array element validators).
 * @returns An object with `rootModel`, `rootValidator`, `path`, and `uniquePath`.
 */
export function computeHierarchy(
  parent: DryvValidator | null | undefined,
  model: object,
  self: DryvValidator,
  field: PropertyKey | undefined,
  index: number | undefined
): { rootModel: object; rootValidator: DryvValidator; path: string; uniquePath: string } {
  const rootModel = parent ? (parent.rootModel ?? model) : model
  const rootValidator = parent ? parent.rootValidator : self
  const paths = computeValidatorPaths(parent?.path, parent?.uniquePath, field, index)

  return {
    rootModel,
    rootValidator,
    path: paths.path,
    uniquePath: paths.uniquePath
  }
}
