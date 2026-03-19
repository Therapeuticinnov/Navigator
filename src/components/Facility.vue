<script setup>
import { onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  facility: { type: Object, default: null },
});

const emit = defineEmits(["close"]);

function close() {
  emit("close");
}

function onKeydown(e) {
  if (e.key === "Escape") close();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

function normalizeUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

/**
 * Print without replacing the DOM.
 * This keeps images (logos) intact and avoids race conditions.
 */
function printFacility() {
  // Optional: ensure logo is loaded before printing
  const imgs = document.querySelectorAll("#facility-print img");
  const waits = Array.from(imgs).map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        }),
  );

  Promise.all(waits).finally(() => window.print());
}

/**
 * Optional nicety: prevent background page scroll when modal is open
 */
watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? "hidden" : "";
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="open && facility" class="fixed inset-0 z-50">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40" @click="close"></div>

    <!-- Modal wrapper -->
    <div class="md:absolute inset-0 flex items-start justify-center p-4">
      <div
        class="w-full md:max-w-[40vw] rounded-xl overflow-hidden bg-white shadow-xl relative h-fit"
      >
        <!-- Top bar -->
        <div
          class="bg-[#0B2E4D] text-white px-4 py-2 flex items-center justify-between"
        >
          <div class="text-sm font-semibold">
            {{ facility.facilityname }}
          </div>

          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-1 text-white/90 hover:text-white"
              title="Print"
              aria-label="Print"
              @click="printFacility"
            >
              <!-- Print icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"
                />
              </svg>

              <span class="text-sm underline">Print</span>
            </button>

            <button
              class="text-white/80 hover:text-white text-xl leading-none"
              aria-label="Close"
              @click="close"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Printable content -->
        <div id="facility-print" class="p-4 space-y-4">
          <!-- Title -->
          <h2 class="text-xl font-semibold text-[#0B2E4D]">
            {{ facility.facilityname }}
          </h2>

          <!-- Info -->
          <p
            v-if="facility.info"
            class="text-[10px] md:text-sm leading-relaxed text-slate-700"
          >
            {{ facility.info }}
          </p>

          <!-- Capabilities -->
          <div v-if="facility.capabilities?.length">
            <div class="text-[10px] md:text-sm font-semibold text-[#0B2E4D] mb-1">
              Capabilities
            </div>
            <div class="text-[10px] md:text-sm text-slate-700">
              <span v-for="(cap, i) in facility.capabilities" :key="cap + i">
                {{ cap
                }}<span v-if="i < facility.capabilities.length - 1"> | </span>
              </span>
            </div>
          </div>

          <!-- Therapeutics -->
          <div v-if="facility.therapeutics?.length">
            <div class="text-[10px] md:text-sm font-semibold text-[#0B2E4D] mb-1">
              Therapeutics
            </div>
            <div class="text-[10px] md:text-sm text-slate-700">
              {{ facility.therapeutics.join(", ") }}
            </div>
          </div>

          <!-- Contacts -->
          <div v-if="facility.contacts?.length">
            <div class="text-[10px] md:text-sm font-semibold text-[#0B2E4D] mb-1">
              Contacts
            </div>
            <div class="text-[10px] md:text-sm text-slate-700">
              <span
                v-for="(c, i) in facility.contacts"
                :key="(c.contactemail || c.contactname) + i"
              >
                <a
                  v-if="c.contactemail"
                  class="text-blue-700 underline"
                  :href="`mailto:${c.contactemail}`"
                >
                  {{ c.contactname || c.contactemail }}
                </a>
                <span v-else>
                  {{ c.contactname }}
                </span>
                <span v-if="i < facility.contacts.length - 1"> | </span>
              </span>
            </div>
          </div>

          <!-- Location -->
          <div v-if="facility.location">
            <div class="text-[10px] md:text-sm font-semibold text-[#0B2E4D] mb-1">
              Location
            </div>
            <div class="text-[10px] md:text-sm text-slate-700">{{ facility.location }}</div>
          </div>

          <!-- Quality standards -->
          <div>
            <div class="text-[10px] md:text-sm font-semibold text-[#0B2E4D] mb-1">
              Quality standards
            </div>
            <div class="text-[10px] md:text-sm text-slate-700">
              {{ facility.qualityStandards || "Not applicable" }}
            </div>
          </div>

          <!-- Website -->
          <div v-if="facility.website">
            <a
              class="text-blue-700 font-semibold underline"
              :href="normalizeUrl(facility.website)"
              target="_blank"
              rel="noreferrer"
            >
              Website
            </a>
          </div>

          <!-- Logo footer -->
          <div class="pt-2 flex justify-end">
            <img
              v-if="facility.logo"
              :src="facility.logo"
              alt="Facility logo"
              class="h-14 md:h-24 object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  /* Hide everything by default */
  :global(body) * {
    visibility: hidden !important;
  }

  /* Show ONLY the printable content */
  #facility-print,
  #facility-print * {
    visibility: visible !important;
  }

  /* Put printable content at the top-left of the page */
  #facility-print {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    padding: 16px !important;
  }

  /* Hide modal chrome/backdrop/buttons */
  button {
    display: none !important;
  }
}
</style>
