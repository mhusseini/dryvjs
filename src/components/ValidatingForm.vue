<template>
  <pre>{{value}}</pre>
  <pre>{{model}}</pre>
  <form>
    <form-input v-model="value" label="Value"/>
    <form-input v-model="bindingModel.anrede" label="Anrede"/>
    <form-input v-model="bindingModel.vorname" label="Vorname"/>
    <form-input v-model="bindingModel.nachname" label="Nachname"/>
    <form-input v-model="bindingModel.geburtsdatum" label="Geburtsdatum"/>
    <form-input v-model="bindingModel.emailAdresse" label="E-Mail-Adresse"/>
    <form-input v-model="bindingModel.telefonNummer" label="Telefonnummer"/>
    <form-input v-model="bindingModel.werberVertragsnummer" label="Werber-Vertragsnummer"/>
    <div v-if="bindingModel.child">
      <form-input v-model="bindingModel.child.anrede" label="Kind Anrede"/>
      <form-input v-model="bindingModel.child.vorname" label="Kind Vorname"/>
      <form-input v-model="bindingModel.child.nachname" label="Kind Nachname"/>
      <form-input v-model="bindingModel.child.geburtsdatum" label="Kind Geburtsdatum"/>
      <form-input v-model="bindingModel.child.emailAdresse" label="Kind E-Mail-Adresse"/>
      <form-input v-model="bindingModel.child.telefonNummer" label="Kind Telefonnummer"/>
      <form-input v-model="bindingModel.child.werberVertragsnummer" label="Kind Werber-Vertragsnummer"/>
    </div>
    <button @click.prevent="validate">Validate</button>
  </form>
</template>

<script setup lang="ts">
import FormInput from "@/components/FormInput.vue";
import type {PersonalData} from "@/models";
import {useDryv} from "@/dryv";
import {ref} from "vue";

const value = ref<string>("test");
const data: PersonalData = {
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
};

const {model,bindingModel, validate} = useDryv(data, "PersonalData");

</script>
