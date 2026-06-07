# DryvJS

**A model-based, reactive validation framework for JavaScript and TypeScript.**

DryvJS provides a powerful, framework-agnostic validation engine that operates directly on your data models. It supports synchronous and asynchronous validation rules, nested object and array validation, field-level and form-level validation, grouped validation messages, server-side validation integration, and dirty tracking with commit/revert semantics.

The name "Dryv" stands for **D**ynamic **R**eactive **Y**ielding **V**alidation.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`dryvjs`](./packages/dryvjs) | Core validation engine — framework-agnostic | `1.0.1-pre.0` |
| [`dryvue`](./packages/dryvue) | Vue 3 integration for DryvJS | `2.0.1-pre.0` |

## Key Features

- **Model-based validation** — Define validation rules against your TypeScript interfaces; the framework builds a validator tree that mirrors your data model.
- **Reactive** — Field changes automatically trigger validation. Choose from multiple trigger strategies: `immediate`, `auto`, `manual`, or `autoAfterManual`.
- **Nested objects & arrays** — Validators are created recursively for nested objects and arrays, including deep path-based rule matching (e.g. `people.attendees.name`).
- **Async & server-side rules** — Rules can call server endpoints for complex validation and seamlessly integrate the results.
- **Grouped messages** — Assign validation results to named groups for consolidated error display.
- **Related fields** — A rule on one field can trigger re-validation of related fields.
- **Disablers** — Conditionally disable validation for specific fields.
- **Dirty tracking** — Track whether fields have been modified, with `commit()` and `revert()` support.
- **Warning support** — Distinguish between errors and warnings; detect new warnings via hash comparison.
- **Server validation results** — Apply server-returned validation messages to the validator tree with `setValidationResult()`.
- **Extensible options** — Customize server calls, date parsing, result formatting, exception handling, and more.

## Project Structure

```
dryvjs/
├── packages/
│   ├── dryvjs/      # Core validation engine
│   ├── dryvue/      # Vue 3 bindings
│   └── devapp/      # Development/demo application
```

## Quick Start

### Installation

```bash
# Core package (framework-agnostic)
npm install dryvjs

# Vue 3 integration
npm install dryvue
```

### Basic Example (Vanilla JS/TS)

```typescript
import {
  DryvValidationSession,
  DryvObjectValidator,
  defaultDryvOptions,
  type DryvValidationRuleSet
} from 'dryvjs'

interface UserForm {
  name: string
  email: string
}

const ruleSet: DryvValidationRuleSet<UserForm> = {
  name: 'UserForm',
  validators: {
    name: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.name ? 'Name is required' : null
      }
    ],
    email: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.email ? 'Email is required' : null
      },
      {
        validate: ($m) =>
          $m.email && !$m.email.includes('@')
            ? { type: 'error', text: 'Invalid email format' }
            : null
      }
    ]
  }
}

const model: UserForm = { name: '', email: '' }
const options = { ...defaultDryvOptions }
const session = new DryvValidationSession<UserForm>(options, ruleSet)
const validator = new DryvObjectValidator<UserForm>(model, session, undefined, options)

const result = await validator.validate()
console.log(result.success)    // false
console.log(result.hasErrors)  // true
```

### Basic Example (Vue 3)

```typescript
import { createApp } from 'vue'
import { Dryv } from 'dryvue'
import App from './App.vue'

createApp(App).use(Dryv).mount('#app')
```

```vue
<template>
  <form @submit.prevent="validate">
    <input v-model="validatable.name.value" />
    <span v-if="validatable.name.hasErrors">{{ validatable.name.text }}</span>

    <input v-model="validatable.email.value" />
    <span v-if="validatable.email.hasErrors">{{ validatable.email.text }}</span>

    <button type="submit">Submit</button>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useDryv, type DryvValidationRuleSet } from 'dryvue'

interface UserForm {
  name: string
  email: string
}

const data = reactive<UserForm>({ name: '', email: '' })

const ruleSet: DryvValidationRuleSet<UserForm> = {
  name: 'UserForm',
  validators: {
    name: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.name ? 'Name is required' : null
      }
    ],
    email: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.email ? 'Email is required' : null
      }
    ]
  }
}

const { validatable, validate, valid, dirty } = useDryv(data, ruleSet)
</script>
```

## Development

```bash
# Build all packages
cd packages/dryvjs && npm run build
cd packages/dryvue && npm run build

# Run dev app
cd packages/devapp && npm run dev
```

## License

MIT
