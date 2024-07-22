import type { DryvValidationResult, DryvValidationSession } from './'
import {
  DryvObjectValidator,
  DryvOptions,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidator
} from './'
import { getMemberByPath } from '@/internal'

export class DryvFieldValidator<TModel extends object, TParameters = any> extends DryvValidator<
  TModel,
  TParameters,
  DryvObjectValidator
> {
  private _initialValue: TModel[keyof TModel]

  constructor(
    model: TModel,
    session: DryvValidationSession<TModel, TParameters>,
    parent: DryvObjectValidator,
    options: DryvOptions,
    field: keyof TModel
  ) {
    super(model, session, parent, options, field)
    this._initialValue = model[field]
  }

  override get value(): any {
    return this.model[this.field!]
  }

  override set value(value: any) {
    this.model[this.field!] = value
  }

  override refreshDirty() {
    const wasDirty = this.isDirty
    const v = this.value
    const iv = this._initialValue

    this.isDirty = !!v !== !!iv && v !== iv

    if (this.isDirty !== wasDirty) {
      this.parent?.refreshDirty()
    }
  }

  override revert() {
    this.value = this._initialValue
    super.revert()
  }

  override commit() {
    this._initialValue = this.value
    super.commit()
  }

  override childValidators(): DryvValidator[] {
    return []
  }

  override async validate(): Promise<DryvValidationResult> {
    return this.session.validateField(this, this.rootModel)
  }

  setValidationResult(response: DryvServerValidationResponse | DryvServerErrors): boolean {
    const messages: DryvServerErrors =
      typeof response?.success === 'boolean' ? response.messages : response

    const message = getMemberByPath(messages, this.path!)
    if (message && message.type !== 'success') {
      this.text = message.text ?? ''
      this.group = message.group ?? ''
      this.type = message.type
    } else {
      this.text = null
      this.group = null
      this.type = null
    }

    return this.isSuccess
  }
}
