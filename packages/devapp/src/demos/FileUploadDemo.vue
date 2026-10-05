<template>
  <div class="demo-section">
    <h2>File Upload Validation</h2>
    <p class="text-gray-500 mb-4">
      Demonstrates <code>ValidatingFileInput</code> with file-type, size, and required validation.
      Allowed: PNG, JPEG, GIF, PDF. Max 5 MB per file.
    </p>

    <div class="card">
      <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
        <ValidatingInputText v-model="validatable.title" label="Upload Title" placeholder="e.g. Profile photos" />

        <ValidatingFileInput
          v-model="validatable.files"
          label="Files"
          accept="image/png,image/jpeg,image/gif,application/pdf"
          :multiple="true"
        />

        <Divider />

        <div class="flex gap-2 justify-end">
          <Button label="Clear" severity="secondary" outlined @click="clear" />
          <Button label="Upload" type="submit" icon="pi pi-upload" />
        </div>
      </form>

      <div v-if="lastResult" class="mt-4">
        <Message :severity="lastResult.success ? 'success' : 'error'" :closable="false">
          {{ lastResult.success ? 'Files validated successfully!' : 'Please fix the errors above.' }}
        </Message>
      </div>
    </div>

    <Panel header="Validation State" toggleable collapsed class="mt-4">
      <pre class="text-sm overflow-auto">{{ JSON.stringify({ valid, dirty }, null, 2) }}</pre>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import ValidatingInputText from '@/components/ValidatingInputText.vue'
import ValidatingFileInput from '@/components/ValidatingFileInput.vue'
import { useDryv, type DryvValidationResult } from '@softwareproduction/dryvue'
import { fileUploadRules } from '@/rules/fileUploadRules'
import type { FileUploadForm } from '@/models'

const data = reactive<FileUploadForm>({
  title: '',
  files: []
})

const { validatable, validate, valid, dirty, clear } = useDryv(data, fileUploadRules)

const lastResult = ref<DryvValidationResult | null>(null)

async function onSubmit() {
  lastResult.value = await validate()
}
</script>
