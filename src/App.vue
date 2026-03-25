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

// Default view = Therapeutic Innovation Australia
const selectedOrgFilters = ref(["TIA"]);
const selectedState = ref("ALL");

const COL = {
  PRIMARY: 5250158902857604,
  DESC: 5720803231092612,
  EMAILS: 3469003417407364,
  CONTACTS: 7972603044777860,
  CAPS: 654253650300804,
  ORG: 1780153557143428,
  TRL: 5442021735747460,
  STATE: 6504357328883588,
  THERAPEUTIC_AREA: 3158792419446660,
  CAPABILITY_AREA: 2032892512604036,
  WEBSITE: 433134568247172,
};

const orgFilterButtons = [
  { key: "TIA", label: "Therapeutic Innovation Australia" },
  { key: "NCRIS", label: "NCRIS Enabled" },
  { key: "COMPANY", label: "Company" },
  { key: "MRI", label: "Medical Research Institute" },
  { key: "UNIVERSITY", label: "University" },
  { key: "ALL", label: "All" },
];

function openFacility(facility) {
  selectedFacility.value = facility;
  facilityOpen.value = true;
}

function closeFacility() {
  facilityOpen.value = false;
  selectedFacility.value = null;
}

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
    if (contactname || contactemail) {
      contacts.push({ contactname, contactemail });
    }
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
    const therapeuticAreaRaw = cellValueByVirtualId(row, COL.THERAPEUTIC_AREA);
    const capabilityAreaRaw = cellValueByVirtualId(row, COL.CAPABILITY_AREA);
    const website = cellValueByVirtualId(row, COL.WEBSITE);

    const { trlstartlevel, trlendlevel } = parseTrlRange(trlRaw);

    return {
      facilityname: facilityname || "Unknown facility",
      facilityid: slugify(facilityname) || String(row.id),
      trlstartlevel,
      trlendlevel,
      info: info || "",
      capabilities: splitCommaList(capabilitiesRaw),
      therapeutics: [],
      therapeuticArea: splitCommaList(therapeuticAreaRaw),
      capabilityArea: splitCommaList(capabilityAreaRaw),
      contacts: buildContacts(contacts, emails),
      location: state || "",
      qualityStandards: "",
      website: website || "",
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

function compareByTRLThenName(a, b) {
  const startDiff = (a.trlstartlevel || 0) - (b.trlstartlevel || 0);
  if (startDiff !== 0) return startDiff;

  const endDiff = (a.trlendlevel || 0) - (b.trlendlevel || 0);
  if (endDiff !== 0) return endDiff;

  return (a.facilityname || "").localeCompare(b.facilityname || "");
}

function toggleOrgFilter(key) {
  if (key === "ALL") {
    selectedOrgFilters.value = [];
    return;
  }

  const current = [...selectedOrgFilters.value];
  const idx = current.indexOf(key);

  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(key);
  }

  selectedOrgFilters.value = current;
}

function isOrgFilterActive(key) {
  if (key === "ALL") {
    return selectedOrgFilters.value.length === 0;
  }
  return selectedOrgFilters.value.includes(key);
}

function resetFilters() {
  query.value = "";
  selectedState.value = "ALL";
  selectedOrgFilters.value = ["TIA"];
}

const stateOptions = computed(() => {
  const set = new Set();

  facilities.value.forEach((f) => {
    if (f.location) set.add(f.location.trim());
  });

  return [...set].sort((a, b) => a.localeCompare(b));
});

function includesTerm(text, term) {
  const t = String(text || "").toLowerCase();

  return (
    t.includes(term) ||
    t.includes(term + "ing") ||
    t.includes(term.replace(/e$/, "") + "ing")
  );
}

function scoreFacilityForTerms(facility, terms) {
  const fields = {
    name: (facility.facilityname || "").toLowerCase(),
    capabilities: Array.isArray(facility.capabilities)
      ? facility.capabilities.join(" ").toLowerCase()
      : "",
    therapeutics: Array.isArray(facility.therapeutics)
      ? facility.therapeutics.join(" ").toLowerCase()
      : "",
    info: (facility.info || "").toLowerCase(),
    therapeuticArea: Array.isArray(facility.therapeuticArea)
      ? facility.therapeuticArea.join(" ").toLowerCase()
      : "",
    capabilityArea: Array.isArray(facility.capabilityArea)
      ? facility.capabilityArea.join(" ").toLowerCase()
      : "",
    organisationType: (facility.organisationType || "").toLowerCase(),
    location: (facility.location || "").toLowerCase(),
  };

  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    let termMatched = false;

    if (includesTerm(fields.name, term)) {
      score += 6;
      termMatched = true;
    }
    if (includesTerm(fields.therapeuticArea, term)) {
      score += 5;
      termMatched = true;
    }
    if (includesTerm(fields.capabilityArea, term)) {
      score += 5;
      termMatched = true;
    }
    if (includesTerm(fields.capabilities, term)) {
      score += 4;
      termMatched = true;
    }
    if (includesTerm(fields.therapeutics, term)) {
      score += 4;
      termMatched = true;
    }
    if (includesTerm(fields.info, term)) {
      score += 3;
      termMatched = true;
    }
    if (includesTerm(fields.organisationType, term)) {
      score += 2;
      termMatched = true;
    }
    if (includesTerm(fields.location, term)) {
      score += 1;
      termMatched = true;
    }

    if (termMatched) {
      matchedTerms += 1;
    }
  }

  if (matchedTerms === terms.length && terms.length > 1) {
    score += 10;
  } else if (matchedTerms > 1) {
    score += matchedTerms * 2;
  }

  return { score, matchedTerms };
}

const filteredFacilities = computed(() => {
  const q = query.value.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  const filtered = facilities.value.filter((f) => {
    const org = (f.organisationType || "").toLowerCase();

    let matchesOrg = true;
    if (selectedOrgFilters.value.length > 0) {
      matchesOrg = selectedOrgFilters.value.some((filterKey) => {
        if (filterKey === "TIA") {
          return org.includes("therapeutic innovation australia");
        }
        if (filterKey === "NCRIS") {
          return org.includes("ncris enabled");
        }
        if (filterKey === "COMPANY") {
          return org.includes("for profit company");
        }
        if (filterKey === "MRI") {
          return org.includes("medical research institute");
        }
        if (filterKey === "UNIVERSITY") {
          return org.includes("university element");
        }
        return false;
      });
    }

    let matchesState = true;
    if (selectedState.value !== "ALL") {
      matchesState =
        (f.location || "").toLowerCase() === selectedState.value.toLowerCase();
    }

    if (!matchesOrg || !matchesState) {
      return false;
    }

    if (!terms.length) {
      return true;
    }

    const { matchedTerms } = scoreFacilityForTerms(f, terms);
    return matchedTerms === terms.length;
  });

  // No search: keep existing TRL + alphabetical sort
  if (!terms.length) {
    return sortFacilitiesByTRL(filtered);
  }

  // Search active: sort by relevance, then TRL, then alphabetical
  return [...filtered].sort((a, b) => {
    const aScore = scoreFacilityForTerms(a, terms);
    const bScore = scoreFacilityForTerms(b, terms);

    if (bScore.matchedTerms !== aScore.matchedTerms) {
      return bScore.matchedTerms - aScore.matchedTerms;
    }

    if (bScore.score !== aScore.score) {
      return bScore.score - aScore.score;
    }

    return compareByTRLThenName(a, b);
  });
});

const facilityCountText = computed(() => {
  return `Showing ${filteredFacilities.value.length} of ${facilities.value.length} facilities`;
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

        <div class="flex flex-wrap gap-2 items-center">
          <button v-for="button in orgFilterButtons" :key="button.key" @click="toggleOrgFilter(button.key)" :class="[
            'px-3 py-2 rounded-md text-sm font-medium transition',
            isOrgFilterActive(button.key)
              ? 'bg-[#004B75] text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
          ]">
            {{ button.label }}
          </button>
        </div>

        <div class="min-w-[190px]">
          <label class="mb-1 block text-sm font-medium text-gray-700">
            State
          </label>
          <select v-model="selectedState"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#004B75] focus:ring-2 focus:ring-[#004B75]/20">
            <option value="ALL">All States</option>
            <option v-for="state in stateOptions" :key="state" :value="state">
              {{ state }}
            </option>
          </select>
        </div>

        <div class="min-w-[120px] flex items-end">
          <button @click="resetFilters"
            class="w-full px-3 py-2 rounded-md text-sm font-medium transition bg-white border border-[#004B75] text-[#004B75] hover:bg-[#004B75]/5">
            Reset
          </button>
        </div>
      </div>

      <div class="text-sm text-gray-600 font-medium">
        {{ facilityCountText }}
      </div>

      <Scales :scales="scales" :facilities="filteredFacilities" @select-facility="openFacility" />
    </div>

    <Facility :open="facilityOpen" :facility="selectedFacility" @close="closeFacility" />
  </div>
</template>

<style scoped></style>