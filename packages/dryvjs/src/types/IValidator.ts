import type { DryvValidationResult } from './results'

/**
 * Core validator contract used by cross-cutting modules (session, result builders,
 * rule execution). Decouples these modules from the concrete `DryvValidator` class,
 * eliminating circular imports through the barrel.
 */
export interface IValidator<TModel extends object = any> {
  readonly path: string | null
  readonly uniquePath: string
  readonly field: keyof TModel | undefined
  readonly rootModel: TModel
  readonly rootValidator: IValidator<TModel>
  readonly model: TModel
  parent: IValidator | null | undefined

  type: string | null
  text: string | null
  group: string | null

  clear(): void
  childValidators(): IValidator[]
  validate(): Promise<DryvValidationResult>
}
