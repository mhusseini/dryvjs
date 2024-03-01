<template>
  <div class="row">
    <label>{{ label }}<span v-if="validatable.required">*</span>: </label>
    <input ref="input" v-model="validatable.value" />
    <div class="error" v-show="validatable.hasError && !validatable.groupShown">
      {{ validatable.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { type DryvValidatable, useDryvValueProp } from 'dryvue'

const props = defineProps<{
  modelValue: string | DryvValidatable<any, string>
  label: string
}>()

const emit = defineEmits(['update:modelValue'])
const validatable = useDryvValueProp(emit, () => props.modelValue)
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
