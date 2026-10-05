/**
 * Event emitted by the observable object proxy (Layer 1) when a model property is assigned.
 *
 * @typeParam TModel - The model type whose field was mutated.
 */
export interface FieldEvent<TModel> {
    /** The previous value of the field before the assignment. */
    oldValue: any
    /** The new value being assigned to the field. */
    newValue: any
    /** The property key of the mutated field. */
    field: keyof TModel
}

/**
 * Event emitted by the observable array proxy (Layer 1) when the array is mutated.
 *
 * @typeParam TModel - The element type of the array.
 */
export interface ArrayEvent<TModel> {
    /** The kind of mutation that occurred. */
    action: 'insert' | 'append' | 'remove' | 'replace'
    /** Elements removed or replaced (present for `remove` and `replace` actions). */
    oldValue?: TModel[]
    /** Elements added or inserted (present for `insert`, `append`, and `replace` actions). */
    newValue?: TModel[]
}
