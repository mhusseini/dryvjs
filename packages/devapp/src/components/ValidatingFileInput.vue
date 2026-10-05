<template>
  <div class="field">
    <label :for="id">{{ label }}<span v-if="validatable?.required" class="text-red-500 ml-1">*</span></label>
    <div
      class="file-drop-zone"
      :class="{ 'file-drop-zone--over': isDragOver, 'file-drop-zone--invalid': validatable?.hasErrors }"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <input
        :id="id"
        ref="fileInputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="file-input-hidden"
        @change="onFileChange"
      />
      <div v-if="!selectedFiles.length" class="file-drop-placeholder" @click="fileInputRef?.click()">
        <i class="pi pi-upload" style="font-size: 1.5rem; color: #94a3b8;" />
        <span class="text-gray-500 text-sm">{{ placeholder }}</span>
      </div>
      <div v-else class="file-list">
        <div v-for="(file, i) in selectedFiles" :key="i" class="file-item">
          <i class="pi pi-file" />
          <span class="text-sm">{{ file.name }}</span>
          <span class="text-gray-400 text-sm">({{ formatSize(file.size) }})</span>
          <button type="button" class="file-remove" @click="removeFile(i)">
            <i class="pi pi-times" />
          </button>
        </div>
        <button type="button" class="file-add-more text-sm" @click="fileInputRef?.click()">
          <i class="pi pi-plus" /> {{ multiple ? 'Add more files' : 'Replace file' }}
        </button>
      </div>
    </div>
    <small v-if="validatable?.hasErrors && !validatable?.groupShown" class="text-red-500">
      {{ validatable.text }}
    </small>
    <small v-else-if="validatable?.hasWarnings && !validatable?.groupShown" class="text-yellow-600">
      {{ validatable.text }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { type DryvValidatable, useDryvValueProp } from '@softwareproduction/dryvue'

const props = withDefaults(defineProps<{
  modelValue: File[] | DryvValidatable<any> | undefined
  label: string
  accept?: string
  multiple?: boolean
  placeholder?: string
  id?: string
}>(), {
  accept: '',
  multiple: false,
  placeholder: 'Drop files here or click to browse',
  id: () => `field-${Math.random().toString(36).slice(2, 9)}`
})

const emit = defineEmits(['update:modelValue'])
const validatable = useDryvValueProp(emit, () => props.modelValue)

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const selectedFiles = ref<File[]>([])

function syncToValidatable() {
  validatable.value.value = selectedFiles.value.length ? [...selectedFiles.value] : []
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  if (props.multiple) {
    selectedFiles.value.push(...Array.from(input.files))
  } else {
    selectedFiles.value = [input.files[0]]
  }
  input.value = ''
  syncToValidatable()
}

function onDrop(event: DragEvent) {
  isDragOver.value = false
  const files = event.dataTransfer?.files
  if (!files?.length) return
  if (props.multiple) {
    selectedFiles.value.push(...Array.from(files))
  } else {
    selectedFiles.value = [files[0]]
  }
  syncToValidatable()
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
  syncToValidatable()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Keep local list in sync when the validatable value is cleared externally (e.g. form reset)
watch(() => validatable.value?.value, (val) => {
  if (!val || (Array.isArray(val) && val.length === 0)) {
    selectedFiles.value = []
  }
})
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.file-drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 1rem;
  transition: border-color 0.2s, background 0.2s;
  background: #fafbfc;
}

.file-drop-zone--over {
  border-color: var(--p-primary-color, #3b82f6);
  background: #eff6ff;
}

.file-drop-zone--invalid {
  border-color: #ef4444;
}

.file-input-hidden {
  display: none;
}

.file-drop-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 1rem 0;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.15rem;
  line-height: 1;
}
.file-remove:hover {
  color: #ef4444;
}

.file-add-more {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--p-primary-color, #3b82f6);
  padding: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.file-add-more:hover {
  text-decoration: underline;
}
</style>
