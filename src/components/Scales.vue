<script setup>
import { computed } from "vue";

const props = defineProps({
  scales: { type: Array, default: () => [] },
  facilities: { type: Array, default: () => [] },
});

const emit = defineEmits(["select-facility"]);

const scales = computed(() => props.scales);
const facilities = computed(() => props.facilities);

const scaleCount = computed(() => scales.value.length || 1);
const colWidthPct = computed(() => 100 / scaleCount.value);

const headerTextColor = (scale) => {
  return scale.scaleid <= 3 ? "#0F172A" : "#FFFFFF";
};

const shouldScroll = computed(() => (facilities.value.length || 0) > 10);

const facilityPosStyle = (facility) => {
  const startRaw = Number(facility.trlstartlevel);
  const endRaw = Number(facility.trlendlevel ?? facility.triendlevel);

  const start = Math.max(
    1,
    Math.min(Number.isFinite(startRaw) ? startRaw : 1, scaleCount.value),
  );

  const end = Math.max(
    start,
    Math.min(Number.isFinite(endRaw) ? endRaw : start, scaleCount.value),
  );

  const left = (start - 1) * colWidthPct.value;
  const width = (end - start + 1) * colWidthPct.value;

  return {
    left: `calc(${left}% + 1rem)`,
    width: `calc(${width}% - 2rem)`,
  };
};

const facilityBgColor = (facility) => {
  const start = Number(facility.trlstartlevel);
  if (!Number.isFinite(start)) return "#9CA3AF";
  return scales.value[start - 1]?.scalecolor ?? "#9CA3AF";
};

const facilityTextColor = (facility) => {
  const start = Number(facility.trlstartlevel);
  return start <= 3 ? "#0F172A" : "#FFFFFF";
};

const facilityCount = computed(() => facilities.value.length || 1);

const facilityRowHeight = computed(() => {
  if (shouldScroll.value) return "2rem";
  return `clamp(1.75rem, calc((85vh - 3.5rem) / ${facilityCount.value}), 2rem)`;
});

const trlDescriptions = {
  1: {
    title: "Discovery research",
    description:
<<<<<<< HEAD
      "Fundamental biological or chemical principles relevant to a potential therapeutic have been identified. Research is exploratory and hypothesis-driven, with no defined therapeutic candidate or clinical pathway.",
=======
      "Fundamentals biological or chemical principles relevant to a potential therapeutic have been identified. Research is exploratory and hypothesis‑driven, with no defined therapeutic candidate or clinical pathway.",
>>>>>>> 81759d7b0dae375686f5ad5b5941a155932bf03c
  },
  2: {
    title: "Target and concept definition",
    description:
      "A therapeutic concept is formulated, including target identification and early modality selection. The intended clinical indication is defined, but no experimental proof of therapeutic feasibility has yet been demonstrated.",
  },
  3: {
    title: "Preclinical proof of concept",
    description:
      "Experimental evidence demonstrates proof of concept in vitro and/or in early in vivo models. Key elements of the therapeutic approach show biological activity relevant to the intended indication.",
  },
  4: {
    title: "Preclinical candidate validation",
    description:
      "An integrated therapeutic candidate or defined lead series is validated in laboratory and preclinical models. Data supports mechanism of action, feasibility of manufacture, and progression toward IND-enabling studies.",
  },
  5: {
    title: "Late preclinical / IND-enabling development",
    description:
      "The therapeutic candidate is optimised and validated in relevant preclinical models. This stage typically includes toxicology, pharmacokinetics/pharmacodynamics, formulation, and early process development in preparation for first-in-human studies.",
  },
  6: {
    title: "Phase I clinical development",
    description:
      "The therapeutic has entered Phase I clinical trials, with first-in-human studies underway to assess safety, tolerability, and pharmacokinetics. Manufacturing, quality, and regulatory systems are in place to support early clinical use.",
  },
  7: {
    title: "Phase II / Phase III clinical development",
    description:
      "The therapeutic is being evaluated in Phase II and/or Phase III clinical trials to assess efficacy, dosing, and clinical benefit in the target patient population, with scalable manufacturing and regulatory engagement well established.",
  },
  8: {
    title: "Market approval and deployment",
    description:
      "The therapeutic has achieved regulatory approval and entered the market. Manufacturing, distribution, and quality systems operate at commercial scale, enabling routine clinical use.",
  },
  9: {
    title: "Post-market monitoring and lifecycle management",
    description:
      "The approved therapeutic is subject to post-market surveillance, including pharmacovigilance, real-world evidence generation, and lifecycle optimisation such as new indications, formulations, or manufacturing improvements.",
  },
};

const onFacilityClick = (facility) => {
  emit("select-facility", facility);
};
</script>

<template>
  <div class="w-[99vw] mt-[2vh] mx-auto">
    <div class="border border-gray-200 rounded-xl overflow-hidden relative bg-white" style="max-height: 75vh">
      <div class="h-full grid" :style="{ gridTemplateColumns: `repeat(${scaleCount}, 1fr)` }">
        <div v-for="scale in props.scales" :key="scale.scaleid"
          class="h-full border-r border-gray-300 relative group last:border-r-0">
          <div class="h-14 flex items-center justify-center font-semibold relative z-10 cursor-help" :style="{
            backgroundColor: scale.scalecolor,
            color: headerTextColor(scale),
          }">
            {{ scale.scalename }}
          </div>

          <div :class="[
            'absolute top-14 w-96 bg-gray-900 text-white text-xs rounded-md p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20',
            scale.scaleid === 1
              ? 'left-0'
              : scale.scaleid === scaleCount
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2',
          ]">
            <div class="font-semibold text-sm mb-1">
              TRL {{ scale.scaleid }} –
              {{ trlDescriptions[scale.scaleid]?.title }}
            </div>

            <div class="text-sm leading-relaxed text-gray-200">
              {{ trlDescriptions[scale.scaleid]?.description }}
            </div>
          </div>

          <div class="h-[calc(90vh-3.5rem)] bg-white"></div>
        </div>
      </div>

      <div class="absolute left-0 right-0 bottom-0 top-14 pointer-events-none">
        <div class="pt-4 h-full pointer-events-auto" :class="shouldScroll ? 'overflow-y-auto' : 'overflow-hidden'"
          style="
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          ">
          <div class="space-y-2">
            <div v-for="(facility, i) in props.facilities" :key="facility.facilityid || facility.facilityname + '-' + i"
              class="relative" :style="{ height: facilityRowHeight }">
              <div
                class="absolute inset-y-0 rounded-md text-[10px] md:text-sm flex items-center px-3 pointer-events-auto overflow-hidden whitespace-nowrap text-ellipsis cursor-pointer shadow-sm transition hover:brightness-95"
                @click="onFacilityClick(facility)" :style="{
                  ...facilityPosStyle(facility),
                  backgroundColor: facilityBgColor(facility),
                  color: facilityTextColor(facility),
                }">
                <span class="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {{ facility.facilityShortName || facility.facilityname }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>