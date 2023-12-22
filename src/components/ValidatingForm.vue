<template>
  <form>
    <div :class="{ invalid: !valid }">
      <form-input v-model="model.anrede" label="Anrede" />
      <form-input v-model="model.vorname" label="Vorname" />
      <form-input v-model="model.nachname" label="Nachname" />
      <form-input v-model="model.geburtsdatum" label="Geburtsdatum" />
      <form-input v-model="model.emailAdresse" label="E-Mail-Adresse" />
      <form-input v-model="model.telefonNummer" label="Telefonnummer" />
      <form-input v-model="model.child.werberVertragsnummer" label="Werber-Vertragsnummer" />
    </div>
    <div class="button-bar">
      <button @click.prevent="revert" :disabled="!dirty && valid">Revert</button>
      <button @click.prevent="validate">Validate</button>
      <button @click.prevent="test">Test</button>
    </div>
  </form>
  <!--  <pre class="debug"> {{ model.$model }} </pre>-->
  <pre class="debug"> {{ model }} </pre>
</template>

<script setup lang="ts">
//import FormInput from "@/components/FormInput.vue";
import FormInput from '@/components/OptionsApiFormInput.vue'
import type { PersonalData } from '@/models'
import { reactive } from 'vue'
import { useDryv } from '@/dryv'
import { useTransaction } from '@/dryv/useTransaction'

let data: PersonalData = reactive({
  //anrede: "text",
  vorname: 'text',
  nachname: 'text',
  geburtsdatum: 'text',
  emailAdresse: 'text',
  telefonNummer: 'text',
  werberVertragsnummer: 'text',
  child: {}
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
const { bindingModel: model, validate, valid, clear } = useDryv(transaction, 'PersonalData')

function revert() {
  rollback()
  clear()
}

function test() {
  debugger
  console.log(model)
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
