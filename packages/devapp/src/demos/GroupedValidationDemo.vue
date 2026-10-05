<template>
  <div class="demo-section">
    <h2>Related Fields &amp; Grouped Messages</h2>
    <p class="text-gray-500 mb-4">
      Demonstrates <code>related</code> fields and <code>useDryvGroupSlot</code>.
      The email and phone fields are cross-validated: at least one must be provided.
      The group message appears once below both fields instead of on each.
    </p>

    <div class="card">
      <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
        <DryvValidationGroup :groups="['contactMethod']">
          <div class="flex flex-col gap-4">
            <ValidatingInputText v-model="validatable.email" label="Email" placeholder="john@example.com" />
            <ValidatingInputText v-model="validatable.phone" label="Phone" placeholder="+1 555 123 4567" />
          </div>
        </DryvValidationGroup>

        <ValidatingTextarea v-model="validatable.message" label="Message" placeholder="Tell us what's on your mind..." />

        <Divider />

        <div class="flex gap-2 justify-end">
          <Button label="Clear" severity="secondary" outlined @click="clear" />
          <Button label="Send Message" type="submit" icon="pi pi-send" />
        </div>
      </form>

      <div v-if="lastResult" class="mt-4">
        <Message :severity="lastResult.success ? 'success' : 'error'" :closable="false">
          {{ lastResult.success ? 'Message sent!' : 'Please fix the errors above.' }}
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import ValidatingInputText from '@/components/ValidatingInputText.vue'
import ValidatingTextarea from '@/components/ValidatingTextarea.vue'
import DryvValidationGroup from '@/components/DryvValidationGroup.vue'
import { useDryv, type DryvValidationResult } from '@softwareproduction/dryvue'
import { contactRules } from '@/rules/contactRules'
import type { ContactForm } from '@/models'

const data = reactive<ContactForm>({
  email: '',
  phone: '',
  preferredContact: '',
  message: ''
})

const { validatable, validate, clear } = useDryv(data, contactRules)

const lastResult = ref<DryvValidationResult | null>(null)

async function onSubmit() {
  lastResult.value = await validate()
}
</script>
