<template>
  <div class="demo-section">
    <h2>Dirty Tracking &amp; Commit / Revert</h2>
    <p class="text-gray-500 mb-4">
      Demonstrates <code>dirty</code>, <code>commit()</code>, <code>revert()</code>, and <code>setValidationResult()</code>.
      Edit fields, commit the baseline, modify again, then revert to the committed state.
    </p>

    <div class="card">
      <div class="flex items-center gap-3 mb-4">
        <Tag :severity="dirty ? 'warn' : 'success'" :value="dirty ? 'Modified' : 'Clean'" />
        <Tag :severity="valid ? 'success' : 'danger'" :value="valid ? 'Valid' : 'Invalid'" />
      </div>

      <div class="flex flex-col gap-4">
        <ValidatingInputText v-model="validatable.displayName" label="Display Name" placeholder="johndoe" />
        <ValidatingTextarea v-model="validatable.bio" label="Bio" placeholder="Tell us about yourself" :rows="3" />
        <ValidatingInputText v-model="validatable.website" label="Website" placeholder="https://example.com" />
      </div>

      <Divider />

      <div class="flex gap-2 justify-end">
        <Button label="Commit" icon="pi pi-save" severity="info" @click="commit" :disabled="!dirty" />
        <Button label="Revert" icon="pi pi-undo" severity="warn" outlined @click="revert" :disabled="!dirty" />
        <Button label="Validate" icon="pi pi-check" @click="onValidate" />
      </div>

      <div class="mt-4" v-if="serverApplied !== null">
        <Divider />
        <h3 class="mb-2">Server Validation Result</h3>
        <p class="text-gray-500 mb-2">Simulating a server response that rejects the display name "admin".</p>
        <Button
          label="Apply Server Error for 'admin'"
          severity="danger"
          outlined
          icon="pi pi-server"
          @click="applyServerResult"
        />
        <Message v-if="serverApplied" severity="info" :closable="false" class="mt-2">
          Server error applied to display name field.
        </Message>
      </div>
    </div>

    <Panel header="Model State" toggleable collapsed class="mt-4">
      <pre class="text-sm overflow-auto">{{ JSON.stringify(model, null, 2) }}</pre>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Tag from 'primevue/tag'
import ValidatingInputText from '@/components/ValidatingInputText.vue'
import ValidatingTextarea from '@/components/ValidatingTextarea.vue'
import { useDryv, type DryvValidationRuleSet } from '@softwareproduction/dryvue'
import type { ProfileForm } from '@/models'

const profileRules: DryvValidationRuleSet<ProfileForm> = {
  name: 'ProfileForm',
  validators: {
    displayName: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.displayName?.trim()
            ? { type: 'error', text: 'Display name is required.', group: null }
            : null
      },
      {
        validate: ($m) =>
          $m.displayName && $m.displayName.length < 3
            ? { type: 'warning', text: 'Display names under 3 characters look odd.', group: null }
            : null
      }
    ],
    bio: [
      {
        validate: ($m) =>
          $m.bio && $m.bio.length > 200
            ? { type: 'error', text: 'Bio must be 200 characters or fewer.', group: null }
            : null
      }
    ],
    website: [
      {
        validate: ($m) =>
          $m.website && !/^https?:\/\/.+/.test($m.website)
            ? { type: 'error', text: 'Website must start with http:// or https://.', group: null }
            : null
      }
    ]
  } as any
}

const data = reactive<ProfileForm>({
  displayName: '',
  bio: '',
  website: '',
  birthDate: '',
  country: ''
})

const { validatable, validate, valid, dirty, commit, revert, model, setValidationResult } = useDryv(data, profileRules)

const serverApplied = ref<boolean | null>(null)

async function onValidate() {
  await validate()
  serverApplied.value = false
}

function applyServerResult() {
  setValidationResult({
    success: false,
    messages: {
      displayName: { type: 'error', text: 'The name "admin" is reserved.', group: null }
    }
  })
  serverApplied.value = true
}
</script>
