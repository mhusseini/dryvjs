<template>
  <form>
    <form-input v-model="model.anrede" label="Anrede"/>
    <form-input v-model="model.vorname" label="Vorname"/>
    <form-input v-model="model.nachname" label="Nachname"/>
    <form-input v-model="model.geburtsdatum" label="Geburtsdatum"/>
    <form-input v-model="model.emailAdresse" label="E-Mail-Adresse"/>
    <form-input v-model="model.telefonNummer" label="Telefonnummer"/>
    <form-input v-model="model.werberVertragsnummer" label="Werber-Vertragsnummer"/>
    <div class="button-bar">
      <button @click.prevent="validate">Validate</button>
    </div>
  </form>
  <pre class="debug"> {{ data }} </pre>
</template>

<script setup lang="ts">
//import FormInput from "@/components/FormInput.vue";
import FormInput from "@/components/OptionsApiFormInput.vue";
import type {PersonalData} from "@/models";
import {useDryv} from "@/dryv";
import {reactive} from "vue";

const data: PersonalData = reactive({
  anrede: "text",
  vorname: "text",
  nachname: "text",
  geburtsdatum: "text",
  emailAdresse: "text",
  telefonNummer: "text",
  werberVertragsnummer: "text",
  child: {
    anrede: "hallo",
    vorname: "hallo",
    nachname: "hallo",
    geburtsdatum: "hallo",
    emailAdresse: "hallo",
    telefonNummer: "hallo",
    werberVertragsnummer: "hallo",
  }
});

//const model = data;

const {bindingModel: model, validate} = useDryv(data, "PersonalData");
</script>

<style lang="scss">
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
