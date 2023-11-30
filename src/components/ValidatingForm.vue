<template>
  <pre>
  </pre>
  <form>
    <form-input :value="validationModel.anrede" label="Anrede"/>
    <form-input :value="validationModel.vorname" label="Vorname"/>
    <form-input :value="validationModel.nachname" label="Nachname"/>
    <form-input :value="validationModel.geburtsdatum" label="Geburtsdatum"/>
    <form-input :value="validationModel.emailAdresse" label="E-Mail-Adresse"/>
    <form-input :value="validationModel.telefonNummer" label="Telefonnummer"/>
    <form-input :value="validationModel.werberVertragsnummer" label="Werber-Vertragsnummer"/>
    <div v-if="validationModel.child">
      <form-input :value="validationModel.child.anrede" label="Kind Anrede"/>
      <form-input :value="validationModel.child.vorname" label="Kind Vorname"/>
      <form-input :value="validationModel.child.nachname" label="Kind Nachname"/>
      <form-input :value="validationModel.child.geburtsdatum" label="Kind Geburtsdatum"/>
      <form-input :value="validationModel.child.emailAdresse" label="Kind E-Mail-Adresse"/>
      <form-input :value="validationModel.child.telefonNummer" label="Kind Telefonnummer"/>
      <form-input :value="validationModel.child.werberVertragsnummer" label="Kind Werber-Vertragsnummer"/>
    </div>
    <button @click.prevent="validate">Validate</button>
  </form>
</template>

<script setup lang="ts">
import {dryvProxy} from "@/dryv/DryvModelProxy";
import {reactive} from "vue";
import FormInput from "@/components/FormInput.vue";
import type {PersonalData} from "@/models";
import {useDemoRuleSet} from "@/PersonalDataValidationRules";
import {createValidationContext} from "@/dryv";

const ruleSet = useDemoRuleSet();

const model = dryvProxy<PersonalData>({
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
      },
    },
    ruleSet, {
      objectWrapper: o => reactive(o),
    });

const validationModel = model.$dryv.value;
const ctx = createValidationContext();

async function validate() {
  const result = await model.$dryv.validate(ctx);
  console.log(result);
}
</script>
