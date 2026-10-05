<template>
  <div class="demo-section">
    <h2>Registration Form</h2>
    <p class="text-gray-500 mb-4">Demonstrates <code>useDryv</code>, field-level validation, required indicators, errors and warnings.</p>

    <div class="card">
      <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatingInputText v-model="validatable.firstName" label="First Name" placeholder="John" />
          <ValidatingInputText v-model="validatable.lastName" label="Last Name" placeholder="Doe" />
        </div>

        <ValidatingInputText v-model="validatable.email" label="Email" type="email" placeholder="john@example.com" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatingInputText v-model="validatable.password" label="Password" type="password" placeholder="Min. 8 characters" />
          <ValidatingInputText v-model="validatable.confirmPassword" label="Confirm Password" type="password" />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox v-model="validatable.agreeTerms.value" :binary="true" inputId="terms" />
          <label for="terms">I agree to the terms and conditions</label>
        </div>
        <small v-if="validatable.agreeTerms?.hasErrors" class="text-red-500 -mt-2">
          {{ validatable.agreeTerms.text }}
        </small>

        <Divider />

        <div class="flex gap-2 justify-end">
          <Button label="Reset" severity="secondary" outlined @click="reset" :disabled="!dirty" />
          <Button label="Register" type="submit" icon="pi pi-check" />
        </div>
      </form>

      <div v-if="lastResult" class="mt-4">
        <Message :severity="lastResult.success ? 'success' : 'error'" :closable="false">
          {{ lastResult.success ? 'Registration successful!' : 'Please fix the errors above.' }}
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
import Checkbox from 'primevue/checkbox'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import ValidatingInputText from '@/components/ValidatingInputText.vue'
import { useDryv, type DryvValidationResult } from '@softwareproduction/dryvue'
import { registrationRules } from '@/rules/registrationRules'
import type { RegistrationForm } from '@/models'

const data = reactive<RegistrationForm>({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false
})

const { validatable, validate, valid, dirty, reset } = useDryv(data, registrationRules)

const lastResult = ref<DryvValidationResult | null>(null)

async function onSubmit() {
  lastResult.value = await validate()
}
</script>
