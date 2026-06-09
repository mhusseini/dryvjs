export interface FieldEvent<TModel> {
    oldValue: any
    newValue: any
    field: keyof TModel
}

export interface ArrayEvent<TModel> {
    action: 'insert' | 'append' | 'remove' | 'replace'
    oldValue?: TModel[]
    newValue?: TModel[]
}
