<script setup>
import { ref, computed, onMounted } from "vue";
import Search from "./components/Search.vue";
import Scales from "./components/Scales.vue";
import Facility from "./components/Facility.vue";

const scales = ref([
  { scalename: "TRL1", scaleid: 1, scalecolor: "#D9E4EA" },
  { scalename: "TRL2", scaleid: 2, scalecolor: "#B2C9D6" },
  { scalename: "TRL3", scaleid: 3, scalecolor: "#8CAEC1" },
  { scalename: "TRL4", scaleid: 4, scalecolor: "#6693AC" },
  { scalename: "TRL5", scaleid: 5, scalecolor: "#407898" },
  { scalename: "TRL6", scaleid: 6, scalecolor: "#1A5D83" },
  { scalename: "TRL7", scaleid: 7, scalecolor: "#004B75" },
  { scalename: "TRL8", scaleid: 8, scalecolor: "#004267" },
  { scalename: "TRL9", scaleid: 9, scalecolor: "#003858" },
]);

const facilities = ref([]);
const query = ref("");

const selectedFacility = ref(null);
const facilityOpen = ref(false);

const filterMode = ref("ALL");
// ALL | TIA | NCRIS | COMPANY | MRI | UNIVERSITY

const selectedState = ref("ALL");

function openFacility(facility) {
  selectedFacility.value = facility;
  facilityOpen.value = true;
}

function closeFacility() {
  facilityOpen.value = false;
  selectedFacility.value = null;
}

const COL = {
  PRIMARY: 5250158902857604,
  DESC: 5720803231092612,
  EMAILS: 3469003417407364,
  CONTACTS: 7972603044777860,
  CAPS: 654253650300804,
  ORG: 1780153557143428,
  TRL: 5442021735747460,
  STATE: 6504357328883588,
};

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitCommaList(v) {
  return String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function cellValueByVirtualId(row, virtualId) {
  const cell = (row.cells || []).find((c) => c.virtualColumnId === virtualId);
  return cell?.value ?? cell?.displayValue ?? "";
}

function parseTrlRange(trlString) {
  const matches = String(trlString || "").match(/\bTRL\s*([1-9])\b/g);
  if (!matches) return { trlstartlevel: 1, trlendlevel: 1 };

  const nums = matches
    .map((m) => Number(m.replace(/[^0-9]/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9);

  if (!nums.length) return { trlstartlevel: 1, trlendlevel: 1 };

  return {
    trlstartlevel: Math.min(...nums),
    trlendlevel: Math.max(...nums),
  };
}

function buildContacts(namesCsv, emailsCsv) {
  const names = splitCommaList(namesCsv);
  const emails = splitCommaList(emailsCsv);

  const maxLen = Math.max(names.length, emails.length);
  const contacts = [];

  for (let i = 0; i < maxLen; i++) {
    const contactname = names[i] || "";
    const contactemail = emails[i] || "";
    if (contactname || contactemail)
      contacts.push({ contactname, contactemail });
  }

  return contacts;
}

function mapReportToFacilities(reportJson) {
  return (reportJson.rows || []).map((row) => {
    const facilityname = cellValueByVirtualId(row, COL.PRIMARY);
    const info = cellValueByVirtualId(row, COL.DESC);
    const emails = cellValueByVirtualId(row, COL.EMAILS);
    const contacts = cellValueByVirtualId(row, COL.CONTACTS);
    const capabilitiesRaw = cellValueByVirtualId(row, COL.CAPS);
    const organisationType = cellValueByVirtualId(row, COL.ORG);
    const trlRaw = cellValueByVirtualId(row, COL.TRL);
    const state = cellValueByVirtualId(row, COL.STATE);

    const { trlstartlevel, trlendlevel } = parseTrlRange(trlRaw);

    return {
      facilityname: facilityname || "Unknown facility",
      facilityid: slugify(facilityname) || String(row.id),
      trlstartlevel,
      trlendlevel,
      info: info || "",
      capabilities: splitCommaList(capabilitiesRaw),
      therapeutics: [],
      contacts: buildContacts(contacts, emails),
      location: state || "",
      qualityStandards: "",
      website: "",
      logo: "",
      organisationType: organisationType || "",
      sheetId: row.sheetId,
      rowId: row.id,
    };
  });
}

async function fetchLogoAttachmentId(sheetId, rowId) {
  const r = await fetch(
    `/api/row-attachments?sheetId=${sheetId}&rowId=${rowId}`,
  );
  const json = await r.json();

  const items = json.data || [];
  const logo = items.find((a) => {
    const name = (a.name || "").toLowerCase();
    const mime = (a.mimeType || "").toLowerCase();
    return (
      mime.startsWith("image/") ||
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp") ||
      name.endsWith(".svg")
    );
  });

  return logo?.id || null;
}

async function loadData() {
  const res = await fetch("/api/report");
  const reportJson = await res.json();
  facilities.value = mapReportToFacilities(reportJson);

  // Load logos in background
  (async () => {
    const concurrency = 5;
    let i = 0;

    async function worker() {
      while (i < facilities.value.length) {
        const idx = i++;
        const f = facilities.value[idx];
        if (!f?.sheetId || !f?.rowId) continue;

        try {
          const attachmentId = await fetchLogoAttachmentId(f.sheetId, f.rowId);
          if (attachmentId) {
            f.logo = `/api/attachment-file?sheetId=${f.sheetId}&attachmentId=${attachmentId}`;
          }
        } catch {
          // ignore per-row logo failures
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
  })();
}

function sortFacilitiesByTRL(list) {
  return [...list].sort((a, b) => {
    const startDiff = (a.trlstartlevel || 0) - (b.trlstartlevel || 0);
    if (startDiff !== 0) return startDiff;

    const endDiff = (a.trlendlevel || 0) - (b.trlendlevel || 0);
    if (endDiff !== 0) return endDiff;

    return (a.facilityname || "").localeCompare(b.facilityname || "");
  });
}

const stateOptions = computed(() => {
  const set = new Set();

  facilities.value.forEach((f) => {
    if (f.location) set.add(f.location.trim());
  });

  return [...set].sort((a, b) => a.localeCompare(b));
});

const filteredFacilities = computed(() => {
  const q = query.value.trim().toLowerCase();

  const filtered = facilities.value.filter((f) => {
    const name = (f.facilityname || "").toLowerCase();
    const caps = Array.isArray(f.capabilities)
      ? f.capabilities.join(" ").toLowerCase()
      : "";
    const thx = Array.isArray(f.therapeutics)
      ? f.therapeutics.join(" ").toLowerCase()
      : "";

    const matchesSearch =
      !q || name.includes(q) || caps.includes(q) || thx.includes(q);

    const org = (f.organisationType || "").toLowerCase();

    let matchesButton = true;
    if (filterMode.value === "TIA") {
      matchesButton = org.includes("therapeutic innovation australia");
    } else if (filterMode.value === "NCRIS") {
      matchesButton = org.includes("ncris enabled");
    } else if (filterMode.value === "COMPANY") {
      matchesButton = org.includes("for profit company");
    } else if (filterMode.value === "MRI") {
      matchesButton = org.includes("medical research institute");
    } else if (filterMode.value === "UNIVERSITY") {
      matchesButton = org.includes("university element");
    }

    let matchesState = true;
    if (selectedState.value !== "ALL") {
      matchesState =
        (f.location || "").toLowerCase() === selectedState.value.toLowerCase();
    }

    return matchesSearch && matchesButton && matchesState;
  });

  return sortFacilitiesByTRL(filtered);
});

onMounted(loadData);
</script>

<template>
  <div class="mt-10">
    <div class="w-[99vw] mx-auto space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex-1 min-w-[280px]">
          <Search v-model="query" :facilities="facilities" />
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            @click="filterMode = 'ALL'"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition',
              filterMode === 'ALL'
                ? 'bg-[#004B75] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            All
          </button>

          <button
            @click="filterMode = 'TIA'"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition',
              filterMode === 'TIA'
                ? 'bg-[#004B75] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            Therapeutic Innovation Australia
          </button>

          <button
            @click="filterMode = 'NCRIS'"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition',
              filterMode === 'NCRIS'
                ? 'bg-[#004B75] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            NCRIS Enabled
          </button>

          <button
            @click="filterMode = 'COMPANY'"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition',
              filterMode === 'COMPANY'
                ? 'bg-[#004B75] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            Company
          </button>

          <button
            @click="filterMode = 'MRI'"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition',
              filterMode === 'MRI'
                ? 'bg-[#004B75] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            Medical Research Institute
          </button>

          <button
            @click="filterMode = 'UNIVERSITY'"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition',
              filterMode === 'UNIVERSITY'
                ? 'bg-[#004B75] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            University
          </button>
        </div>

        <div class="min-w-[190px]">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            State
          </label>
          <select
            v-model="selectedState"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#004B75] focus:ring-2 focus:ring-[#004B75]/20"
          >
            <option value="ALL">All States</option>
            <option v-for="state in stateOptions" :key="state" :value="state">
              {{ state }}
            </option>
          </select>
        </div>
      </div>

      <Scales
        :scales="scales"
        :facilities="filteredFacilities"
        @select-facility="openFacility"
      />
    </div>

    <Facility
      :open="facilityOpen"
      :facility="selectedFacility"
      @close="closeFacility"
    />
  </div>
</template>

<style scoped></style>
