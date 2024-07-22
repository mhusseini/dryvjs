export function getMemberByPath<TModel extends object, TResult = any>(
  obj: TModel,
  path: string
): TResult | TModel | null {
  if (!path) {
    return obj
  }
  let result: any = obj

  for (const part of path.split('.')) {
    result = result[part]
    if (result === null) {
      return null
    }
  }

  return result as TResult
}

