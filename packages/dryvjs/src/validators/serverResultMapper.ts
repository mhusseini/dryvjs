import type { DryvServerErrors, DryvServerValidationResponse, IValidator } from '@/types'
import { isStructuredResponse } from '@/types'

/**
 * Maps a server validation response onto a validator tree.
 * Sets text, group, and type on each matching validator node.
 *
 * @param validator - The root validator to map results onto.
 * @param response - The server response (structured or flat error map).
 * @returns `true` if the entire subtree has no errors or warnings.
 */
export function applyServerValidationResult(
  validator: IValidator,
  response: DryvServerValidationResponse | DryvServerErrors
): boolean {
  const messages =
    isStructuredResponse(response) ? response.messages : response

  const message = messages?.[validator.path!]

  if (message && message.type !== 'success') {
    validator.text = message.text ?? ''
    validator.group = message.group ?? ''
    validator.type = message.type ?? null
  } else {
    validator.text = null
    validator.group = null
    validator.type = null
  }

  const isSuccess = !validator.type || validator.type === 'success'

  return validator.childValidators().reduce(
    (acc: boolean, v: IValidator) => applyServerValidationResult(v, response) && acc,
    isSuccess
  )
}
