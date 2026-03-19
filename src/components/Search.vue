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
const suggestions = computed(() => {
  const set = new Set();

  for (const f of props.facilities) {
    if (f?.facilityname) set.add(f.facilityname);

    if (Array.isArray(f?.capabilities)) {
      for (const c of f.capabilities) if (c) set.add(c);
    }

    if (Array.isArray(f?.therapeutics)) {
      for (const t of f.therapeutics) if (t) set.add(t);
    }
  }

  return [...set].sort((a, b) => a.localeCompare(b));
});
</script>

<template>
  <div class="w-[75%] pb-4">
    <label class="block text-sm font-medium mb-2">Search</label>

    <input
      v-model="query"
      list="search-suggestions"
      type="text"
      placeholder="Search facilities, capabilities, therapeutics…"
      class="w-full bg-blue-100 rounded-lg px-3 py-2 border"
    />

    <datalist id="search-suggestions">
      <option v-for="s in suggestions" :key="s" :value="s" />
    </datalist>

    <p class="text-xs mt-2 opacity-70">
      Tip: try “RNAi”, “Small molecule”, or a facility name
    </p>
  </div>
</template>
