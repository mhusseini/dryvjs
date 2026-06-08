<p align="center">
  <img src="packages/dryvue/public/logo.svg" title="Dryv" width="300"><br>
  <span style="font-size: 24px; font-weight: bold;">DRY Validation for Distributed Apps</span>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dryvjs"><img src="https://img.shields.io/npm/v/dryvjs.svg" alt="npm dryvjs"></a>
  <a href="https://www.npmjs.com/package/dryvue"><img src="https://img.shields.io/npm/v/dryvue.svg?label=dryvue" alt="npm dryvue"></a>
  <a href="https://github.com/mhusseini/dryvjs/blob/develop/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  <strong>A model-based, reactive validation framework for JavaScript and TypeScript.</strong>
</p>

---

## What is DryvJS?

DryvJS provides a powerful, framework-agnostic validation engine that operates directly on your data models. Instead of validating individual form inputs in isolation, DryvJS builds a reactive validation tree that mirrors your entire data structure.

The name "Dryv" stands for **D**on't **R**epeat **Y**ourself **V**alidation.

While it excels as a standalone client-side validation library, DryvJS truly shines when paired with [**Dryv**](https://github.com/mhusseini/dryv) for .NET. Together, they allow you to write your validation rules once in C# and execute them seamlessly on both the server and the client.

## Why DryvJS?

Most form validation libraries tie rules to UI components or specific frameworks. This often leads to scattered logic, duplicated rules on the backend, and difficult-to-maintain code when dealing with complex data. 

DryvJS takes a better approach:

- **Model-Driven, Not UI-Driven:** Validation rules are defined against your TypeScript interfaces or C# models, keeping business logic strictly separated from UI representation.
- **Write Once, Validate Everywhere:** When paired with Dryv (.NET), you write your rules in C#. They are automatically translated to JavaScript for the frontend. No more keeping frontend and backend rules in sync manually.
- **Deep Reactivity & Dirty Tracking:** Field changes automatically trigger validation. The engine natively tracks `isDirty` state, allowing you to `commit()` or `revert()` changes out-of-the-box.
- **Complex Structures Made Easy:** Nested objects and arrays are handled naturally. Validators are built recursively to match your data shape, no matter how deep.
- **Seamless Async & Server Rules:** If a rule cannot be evaluated on the client (e.g., checking if an email exists in a database), DryvJS transparently delegates it to a server endpoint and integrates the result back into the validation tree.
- **Extensible & Flexible:** Supports field-level and form-level validation, grouped validation messages, warning states, and custom trigger strategies.

## Packages

The DryvJS ecosystem is split into targeted packages:

| Package | Description | Version |
|---------|-------------|---------|
| [`dryvjs`](./packages/dryvjs) | Core validation engine — framework-agnostic | `1.0.1-pre.0` |
| [`dryvue`](./packages/dryvue) | Vue 3 integration for DryvJS | `2.0.1-pre.0` |

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

For a Vanilla JS/TS example, see the [`dryvjs` package documentation](./packages/dryvjs/README.md).

## Full-Stack Validation with Dryv (C#/.NET)

[**Dryv**](https://github.com/mhusseini/dryv) is a .NET validation library that translates C# validation expressions into JavaScript functions. The output format is **identical** to the `DryvValidationRuleSet` interface consumed by DryvJS and Dryvue — making them a natural pair for full-stack validation.

### How It Works

On the server (C#), you define your rules:

```csharp
using Dryv;

public class Address
{
    public static readonly DryvRules Rules = DryvRules
        .For<Address>()
        .Rule(
            a => a.City,
            a => string.IsNullOrWhiteSpace(a.City)
                ? "Please enter a city."
                : null)
        .Rule(
            a => a.ZipCode,
            a => a.ZipCode.Trim().Length < 5
                ? "ZIP code must have at least 5 characters."
                : null);

    public string City { get; set; }
    public string ZipCode { get; set; }
}
```

Dryv translates these rules to a valid JavaScript object that DryvJS can process:

```javascript
{
  name: "Address",
  validators: {
    city: [{
      validate: function ($m, $ctx) {
        return !/\S/.test($m.city || "")
          ? { type: "error", text: "Please enter a city." }
          : null;
      }
    }],
    zipCode: [{
      validate: function ($m, $ctx) {
        return ($m.zipCode || "").trim().length < 5
          ? { type: "error", text: "ZIP code must have at least 5 characters." }
          : null;
      }
    }]
  },
  disablers: {},
  parameters: {}
}
```

### Integration Approaches

There are three primary ways to feed these rules into your frontend app:

#### 1. Build-Time Code Generation (Recommended for SPAs)

Generate typed TypeScript files from Dryv during development:

```typescript
// generated/validation/Address.ts (auto-generated)
import type { DryvValidationRuleSet } from 'dryvjs'

export const addressValidationRules: DryvValidationRuleSet<AddressInput> = {
  name: "Address",
  validators: { /* generated rules */ },
  disablers: {},
  parameters: {}
}
```

Then use it seamlessly in Vue:

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useDryv } from 'dryvue'
import { addressValidationRules } from '@/generated/validation/Address'

const data = reactive({ city: '', zipCode: '' })
const { validatable, validate } = useDryv(data, addressValidationRules)
</script>
```

#### 2. Server-Rendered (Razor / Tag Helper)

For server-rendered pages, use the Dryv Tag Helper to render rules inline:

```html
@addTagHelper *, Dryv.AspNetCore
<dryv-client-rules for="typeof(Address)" name="address" />
```

This creates a `<script>` tag that attaches the rules to `window.dryv.v`. In your Vue app, you pass these static rule sets to the plugin:

```typescript
import { createApp } from 'vue'
import { Dryv, DryvStaticRuleSets } from 'dryvue'
import App from './App.vue'

createApp(App)
  .use(Dryv)
  .use(DryvStaticRuleSets, window.dryv.v)
  .mount('#app')
```

And reference them by name in your components:

```vue
<script setup lang="ts">
import { useDryv } from 'dryvue'

const { validatable, validate } = useDryv(data, 'address')
</script>
```

#### 3. Runtime Loading via API (Advanced)

> **Note:** Because Dryv's output contains executable JavaScript functions (not pure JSON), loading rules at runtime requires `eval()` or `new Function()`. This is generally discouraged for security and Content Security Policy (CSP) reasons. Prefer code generation or server-rendered scripts.

```typescript
export async function loadValidationRules<T>(modelName: string): Promise<DryvValidationRuleSet<T>> {
  const response = await fetch(`/api/validation/rules/${modelName}`)
  const script = await response.text()
  return eval(`(${script})`)
}
```

### Async Rules & Dynamic Controllers

When Dryv encounters rules that require backend execution (e.g., checking database availability via injected services), it automatically routes them through dynamically generated server endpoints.

The generated JavaScript will utilize `$ctx.dryv.callServer()`. DryvJS intercepts this and handles the asynchronous request transparently:

```csharp
// C# — async rule calling a service
.Rule(
    m => m.Email,
    async m => await emailService.IsAvailable(m.Email)
        ? DryvValidationResult.Success
        : "Email is already taken")
```

DryvJS manages the server call out of the box using `fetch`. No extra configuration is necessary, though you can override `callServer` if you need custom headers or authentication.

### Parameters

Dryv supports runtime parameters (e.g., `DateTime.Today`). These can be fetched from an endpoint separate from the static rules:

```typescript
const { validatable, parameters } = useDryv(data, ruleSet, {
  loadParameters: async (ruleSetName) => {
    const response = await fetch(`/api/validation/parameters/${ruleSetName}`)
    return response.json()
  }
})
```

### Feature Mapping: Dryv (C#) → DryvJS

| Dryv (C#) Feature | DryvJS Equivalent |
|---|---|
| `DryvRules.For<T>().Rule(...)` | `validators` in `DryvValidationRuleSet` |
| `DryvRules.For<T>().DisableRules(...)` | `disablers` in `DryvValidationRuleSet` |
| Multi-property rules (`related`) | `related` array on rule objects |
| `DryvRuleSettings("group")` | `group` property on rule objects |
| `DryvValidationResult.Error(text)` | `{ type: 'error', text }` |
| `DryvValidationResult.Warning(text)` | `{ type: 'warning', text }` |
| `DryvValidationResult.Success` / `null` | `null` (validation passes) |
| `DryvParameters` / `.Parameter(...)` | `parameters` object + `session.parameter(key)` |
| `async` rules via dynamic controllers | `session.dryv.callServer()` |
| Nested model rules | Dot-notation paths (e.g. `address.city`) |
| Collection element rules | Array item rules (e.g. `people.attendees.name`) |
| `[DryvSet("name")]` | Rule set `name` property |
| Annotations (e.g. required) | `annotations` object on rule |

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
