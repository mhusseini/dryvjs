export function getMemberByPath<TResult = any>(obj: any, path: string | symbol): TResult {
  if (!path) {
    return obj
  }
  let result = obj
  for (const part of String(path).split('.')) {
    if (result == null) {
      return result
    }
    result = result[part]
  }
  return result as TResult
}
