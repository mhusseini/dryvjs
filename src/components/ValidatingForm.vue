<template>
  <pre>
  </pre>
  <form>
    <form-input :value="bindingModel.anrede" label="Anrede"/>
    <form-input :value="bindingModel.vorname" label="Vorname"/>
    <form-input :value="bindingModel.nachname" label="Nachname"/>
    <form-input :value="bindingModel.geburtsdatum" label="Geburtsdatum"/>
    <form-input :value="bindingModel.emailAdresse" label="E-Mail-Adresse"/>
    <form-input :value="bindingModel.telefonNummer" label="Telefonnummer"/>
    <form-input :value="bindingModel.werberVertragsnummer" label="Werber-Vertragsnummer"/>
    <div v-if="bindingModel.child">
      <form-input :value="bindingModel.child.anrede" label="Kind Anrede"/>
      <form-input :value="bindingModel.child.vorname" label="Kind Vorname"/>
      <form-input :value="bindingModel.child.nachname" label="Kind Nachname"/>
      <form-input :value="bindingModel.child.geburtsdatum" label="Kind Geburtsdatum"/>
      <form-input :value="bindingModel.child.emailAdresse" label="Kind E-Mail-Adresse"/>
      <form-input :value="bindingModel.child.telefonNummer" label="Kind Telefonnummer"/>
      <form-input :value="bindingModel.child.werberVertragsnummer" label="Kind Werber-Vertragsnummer"/>
    </div>
    <button @click.prevent="validate">Validate</button>
  </form>
</template>

<script setup lang="ts">
import {reactive} from "vue";
import FormInput from "@/components/FormInput.vue";
import type {PersonalData} from "@/models";
import {useDryvFor} from "@/dryv";

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

const {bindingModel, validate} = useDryvFor(data, "PersonalData", {objectWrapper: o => reactive(o),});
</script>
