/**
 * Pure helper that computes the `path` and `uniquePath` for a validator node
 * given its parent's paths, field name, and index. Extracted from DryvValidator.updateHierarchy
 * to isolate the tree-structural concern.
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
