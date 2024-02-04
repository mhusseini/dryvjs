<template>
  <form>
    <div :class="{ invalid: !valid }">
      <validating-input v-model="model.anrede" label="Anrede" />
      <validating-input v-model="model.vorname" label="Vorname" />
      <validating-input v-model="model.nachname" label="Nachname" />
      <validating-input v-model="model.geburtsdatum" label="Geburtsdatum" />
      <validation-group>
        <validating-input v-model="model.emailAdresse" label="E-Mail-Adresse" />
        <validating-input v-model="model.telefonNummer" label="Telefonnummer" />
      </validation-group>
    </div>
    <div class="button-bar">
      <button @click.prevent="revert" :disabled="!dirty && valid">Revert</button>
      <button @click.prevent="validate">Validate</button>
      <button @click.prevent="send">Send</button>
    </div>
  </form>
  <pre class="debug"> {{ model.$model }} </pre>
</template>

<script setup lang="ts">
import ValidatingInput from '@/components/ValidatingInput.vue'
import ValidationGroup from '@/components/ValidationGroup.vue'
import type { PersonalData } from '@/models'
import { reactive } from 'vue'
import { useDryv, useTransaction, DryvServerValidationResponse } from 'dryvue'
import { personalDataValidationRules } from '@/PersonalDataValidationRules'

let data: PersonalData = reactive({
  anrede: 'text',
  vorname: 'text',
  nachname: 'text',
  geburtsdatum: 'text',
  emailAdresse: 'text',
  telefonNummer: 'text',
  werberVertragsnummer: 'text'
  // child: {
  //   anrede: 'hallo',
  //   vorname: 'hallo',
  //   nachname: 'hallo',
  //   geburtsdatum: 'hallo',
  //   emailAdresse: 'hallo',
  //   telefonNummer: 'hallo',
  //   werberVertragsnummer: 'hallo'
  // }
})

// const model = data;
// const dirty = false;
// const valid = true;

const { model: transaction, rollback, dirty } = useTransaction(data)
const {
  bindingModel: model,
  validate,
  valid,
  clear
} = useDryv(transaction, personalDataValidationRules)

function revert() {
  rollback()
  clear()
}

async function send() {
  if (!(await validate()).success) {
    return
  }
  const response: DryvServerValidationResponse =
    model.$model?.vorname === 'text'
      ? {
          success: false,
          messages: {
            vorname: {
              text: 'Der Name ist kacke',
              status: 'error'
            }
          }
        }
      : 'testtet'

  model.$model?.$dryv.set(response)
}
</script>

<style lang="scss">
.invalid {
  background-color: #ff000022;
}

.button-bar {
  display: flex;
  justify-content: flex-end;
  padding: 1em 0;

  button {
    padding: 0.67em;
  }
}

.debug {
  font-size: small;
  background-color: #292929;
  padding: 1em;
}
</style>
