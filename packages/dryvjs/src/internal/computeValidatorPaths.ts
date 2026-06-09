/**
 * Pure helper that computes the `path` and `uniquePath` for a validator node
 * given its parent's paths, field name, and index. Extracted from DryvValidator.updateHierarchy
 * to isolate the tree-structural concern.
 *
 * @param parentPath - The parent validator's `path`, or `null`/`undefined` for the root.
 * @param parentUniquePath - The parent validator's `uniquePath`, or `null`/`undefined` for the root.
 * @param field - The field name or property key of this node.
 * @param index - The array index of this node (for array element validators).
 * @returns An object with the computed `path` and `uniquePath`.
 */
export function computeValidatorPaths(
  parentPath: string | null | undefined,
  parentUniquePath: string | null | undefined,
  field: string | symbol | number | undefined,
  index: number | undefined
): { path: string; uniquePath: string } {
  const path = [parentPath, field].filter((x) => !!x).join('.')
  const uniquePath = [parentUniquePath, index, field]
    .filter((x) => typeof x === 'number' || !!x)
    .join('.')

  return { path, uniquePath }
}
