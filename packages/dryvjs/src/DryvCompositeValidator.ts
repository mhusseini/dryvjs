import type { DryvValidationResult, DryvValidationSession, FieldEvent } from './'
import { DryvFieldValidator, DryvOptions, DryvValidatableObject } from './'
import { DryvValidator } from './DryvValidator'
import { dryvValidatableObject, observableProxy } from '@/internal'

export abstract class DryvCompositeValidator<
  TModel extends object = any,
  TTransparentProxy = any
> extends DryvValidator<TModel, TModel, DryvCompositeValidator> {
  private _ignoreChildChanges = false
  private _isReverting = false
  protected transparentProxy?: TTransparentProxy

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel>,
    parent: DryvCompositeValidator | undefined,
    options: DryvOptions,
    field?: keyof TModel
  ) {
    super(model, session, parent, options, field)
  }

  protected get isReverting() {
    return this._isReverting
  }

  override revert() {
    try {
      this._isReverting = true
      super.revert()
    } finally {
      this._isReverting = false
    }
  }

  refreshDirty() {
    if (this._ignoreChildChanges) {
      return
    }

    const wasDirty = this.isDirty
    this.isDirty = this.childValidators().some((f) => f?.isDirty)

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }
}
