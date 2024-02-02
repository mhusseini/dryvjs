<template>
  <div class="row">
    <label> {{ label }}<span v-if="value.required">*</span>: </label>

    <input ref="input" v-model="value.value" />

    <div class="error" v-show="value.status === 'error'">
      {{ value.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DryvValidatable } from '@/dryv/types'
import { useDryvValueProp } from '@/dryv'

const props = defineProps<{
  modelValue: string | DryvValidatable<any, string>
  label: string
}>()

const emit = defineEmits(['update:modelValue'])
const value = useDryvValueProp(emit, () => props.modelValue)
</script>

<style lang="scss">
.row {
  display: grid;
  gap: 0.5em;
  grid-template-columns: 1fr 2.5fr;

  ~ .row {
    margin-top: 0.67em;
  }

  .error {
    color: red;
    grid-column: 1 / -1;
  }
}
</style>
