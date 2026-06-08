<template>
  <div class="row">
    <label>{{ label }}<span v-if="validatable.required">*</span>: </label>
    <input ref="input" type="file" @change="update" />
    <div class="error" v-show="validatable.hasErrors && !validatable.groupShown">
      {{ validatable.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { type DryvValidatableArray, useDryvValueProp } from '@softwareproduction/dryvue'

const props = defineProps<{
  modelValue: string | DryvValidatableArray | undefined
  label: string
}>()

const emit = defineEmits(['update:modelValue'])
const validatable = useDryvValueProp(emit, () => props.modelValue)

function update(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) {
    validatable.value.value = [...files].map((f) => ({ name: f.name }))
  }
}
</script>

<style lang="scss" scoped>
.row {
  display: grid;
  gap: 0.5em;
  grid-template-columns: 1fr 2.5fr;

  ~ .row {
    margin-top: 0.67em;
  }

  .error {
    grid-column: 1 / -1;
  }
}
</style>
