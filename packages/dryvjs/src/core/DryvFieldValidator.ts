import type { DryvValidationResult, DryvValidationSession } from '@/core'
import { DryvOptions, DryvServerErrors, DryvServerValidationResponse, DryvValidator } from '@/core'
import { getMemberByPath } from '@/core/getMemberByPath'

export class DryvFieldValidator<TModel extends object, TParameters = object> extends DryvValidator<
  TModel,
  TParameters
> {
  constructor(
    model: TModel,
    session: DryvValidationSession<TModel, TParameters>,
    parent: DryvValidator,
    options: DryvOptions,
    field: keyof TModel
  ) {
    super(model, session, parent, options, field)
  }

  override get value(): any {
    return this.model[this.field!]
  }

  override set value(value: any) {
    this.model[this.field!] = value
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
