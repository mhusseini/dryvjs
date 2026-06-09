import type { DryvValidationResultType } from '@/types'
import type { DryvReactiveState } from './DryvValidator'

export class ValidatorState {
  constructor(private _state: DryvReactiveState) {}

  get path(): string | null { return this._state.path }
  set path(value: string | null) { this._state.path = value }

  get uniquePath(): string | null { return this._state.uniquePath }
  set uniquePath(value: string | null) { this._state.uniquePath = value }

  get text(): string | null { return this._state.text }
  set text(value: string | null) { this._state.text = value }

  get group(): string | null { return this._state.group }
  set group(value: string | null) { this._state.group = value }

  get required(): boolean | null { return this._state.required }
  set required(value: boolean | null) { this._state.required = value }

  get groupShown(): boolean { return this._state.groupShown }
  set groupShown(value: boolean) { this._state.groupShown = value }

  get type(): DryvValidationResultType | null { return this._state.type }
  set type(value: DryvValidationResultType | null) { this._state.type = value }

  get isDirty(): boolean { return this._state.isDirty }
  set isDirty(value: boolean) { this._state.isDirty = value }

  reset(includeDirty: boolean) {
    this.type = null
    this.text = null
    this.group = null
    this.groupShown = false
    if (includeDirty) this.isDirty = false
  }
}
