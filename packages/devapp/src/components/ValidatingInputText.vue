<template>
  <div class="field">
    <label :for="id">{{ label }}<span v-if="validatable?.required" class="text-red-500 ml-1">*</span></label>
    <InputText
      :id="id"
      v-model="validatable.value"
      :type="type"
      :invalid="validatable?.hasErrors"
      :placeholder="placeholder"
      class="w-full"
    />
    <small v-if="validatable?.hasErrors && !validatable?.groupShown" class="text-red-500">
      {{ validatable.text }}
    </small>
    <small v-else-if="validatable?.hasWarnings && !validatable?.groupShown" class="text-yellow-600">
      {{ validatable.text }}
    </small>
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import { type DryvValidatable, useDryvValueProp } from '@softwareproduction/dryvue'

const props = withDefaults(defineProps<{
  modelValue: string | DryvValidatable<any> | undefined
  label: string
  type?: string
  placeholder?: string
  id?: string
}>(), {
  type: 'text',
  placeholder: '',
  id: () => `field-${Math.random().toString(36).slice(2, 9)}`
})

const emit = defineEmits(['update:modelValue'])
const validatable = useDryvValueProp(emit, () => props.modelValue)
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
</style>
