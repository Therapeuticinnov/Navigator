<script setup>
import { computed } from "vue";

const props = defineProps({
  facilities: { type: Array, default: () => [] },
  modelValue: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const query = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

// Build a single suggestion list from:
// - facilityname
// - capabilities[]
// - therapeutics[]
// - therapeuticArea[]
// - capabilityArea[]
// (INFO field has been intentionally excluded from suggestions)
const suggestions = computed(() => {
  const q = query.value.trim().toLowerCase();

  // Only show suggestions after more than 6 characters
  if (q.length <= 6) {
    return [];
  }

  const set = new Set();

  for (const f of props.facilities) {
    if (f?.facilityname) set.add(f.facilityname);

    if (Array.isArray(f?.capabilities)) {
      for (const c of f.capabilities) {
        if (c) set.add(c);
      }
    }

    // therapeutics is additional keyword but therapeuticArea is relevant modality
    if (Array.isArray(f?.therapeutics)) {
      for (const t of f.therapeutics) {
        if (t) set.add(t);
      }
    }

    if (Array.isArray(f?.therapeuticArea)) {
      for (const t of f.therapeuticArea) {
        if (t) set.add(t);
      }
    }

    if (Array.isArray(f?.capabilityArea)) {
      for (const c of f.capabilityArea) {
        if (c) set.add(c);
      }
    }

    // NOTE: removed the `if (f?.info) { ... }` block so info text no longer populates suggestions
  }

  return [...set]
    .filter((s) => s.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b));
});
</script>

<template>
  <div class="w-[75%] pb-4">
    <label class="block text-sm font-medium mb-2">Search</label>

    <div class="relative">
      <input v-model="query" list="search-suggestions" type="text"
        placeholder="Enter search terms"
        class="w-full bg-blue-100 rounded-lg px-3 py-2 pr-10 border" />

      <button v-if="query" type="button" @click="query = ''"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-lg leading-none"
        aria-label="Clear search" title="Clear search">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>

    <datalist id="search-suggestions">
      <option v-for="s in suggestions" :key="s" :value="s" />
    </datalist>

    <p class="text-xs mt-2 opacity-70">
      Search for a facility name, capability, therapeutic area, or keyword.
    </p>
  </div>
</template>
