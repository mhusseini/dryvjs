<template>
  <div class="app-container">
    <header class="app-header">
      <div class="flex items-center gap-3">
        <img src="/logo.svg" alt="Dryv" class="logo" />
        <div>
          <h1 class="text-2xl font-bold m-0">Dryvue Demo</h1>
          <p class="text-sm text-gray-500 m-0">DRY Validation for Vue 3</p>
        </div>
      </div>
    </header>

    <main class="app-main">
      <TabView>
        <TabPanel header="Registration">
          <RegistrationDemo />
        </TabPanel>
        <TabPanel header="Grouped Validation">
          <GroupedValidationDemo />
        </TabPanel>
        <TabPanel header="Dirty Tracking">
          <DirtyTrackingDemo />
        </TabPanel>
        <TabPanel header="Array Validation">
          <ArrayValidationDemo />
        </TabPanel>
        <TabPanel header="File Upload">
          <FileUploadDemo />
        </TabPanel>
      </TabView>
    </main>

    <footer class="app-footer">
      <p class="text-sm text-gray-400">
        Dryvue v2 &mdash; <a href="https://github.com/mhusseini/dryvjs" target="_blank" class="text-primary">GitHub</a>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import RegistrationDemo from '@/demos/RegistrationDemo.vue'
import GroupedValidationDemo from '@/demos/GroupedValidationDemo.vue'
import DirtyTrackingDemo from '@/demos/DirtyTrackingDemo.vue'
import ArrayValidationDemo from '@/demos/ArrayValidationDemo.vue'
import FileUploadDemo from '@/demos/FileUploadDemo.vue'
</script>

<style>
:root {
  --app-max-width: 900px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
  color: #334155;
  line-height: 1.6;
}

.app-container {
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 1rem 0 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.app-header .logo {
  height: 48px;
}

.app-main {
  flex: 1;
}

.app-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.demo-section h2 {
  margin: 0 0 0.25rem;
  font-size: 1.4rem;
  color: #1e293b;
}

.card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
}

.text-gray-400 { color: #9ca3af; }
.text-gray-500 { color: #6b7280; }
.text-red-500 { color: #ef4444; }
.text-yellow-600 { color: #ca8a04; }
.text-primary { color: var(--p-primary-color, #3b82f6); }
.text-sm { font-size: 0.875rem; }
.text-2xl { font-size: 1.5rem; }
.font-bold { font-weight: 700; }

.flex { display: flex; }
.flex-1 { flex: 1; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.w-full { width: 100%; }
.m-0 { margin: 0; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.ml-1 { margin-left: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.-mt-2 { margin-top: -0.5rem; }
.overflow-auto { overflow: auto; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: 1fr; }

@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: 1fr 1fr; }
}

code {
  background: #f1f5f9;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  color: #7c3aed;
}

a {
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style>
