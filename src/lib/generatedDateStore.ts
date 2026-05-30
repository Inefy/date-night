// src/lib/generatedDateStore.ts
import type { GeneratedDatePlan } from '@/types/domain';

const MAX_STORED_GENERATED_PLANS = 40;

const generatedPlans = new Map<string, GeneratedDatePlan>();
const primaryPlanIds: string[] = [];
let currentPlanId: string | undefined;

function rememberPrimaryPlanId(id: string, plan: GeneratedDatePlan) {
  for (const candidateId of [id, plan.seed]) {
    const existingIndex = primaryPlanIds.indexOf(candidateId);

    if (existingIndex >= 0) {
      primaryPlanIds.splice(existingIndex, 1);
    }
  }

  primaryPlanIds.push(id);
}

function isPlanSeedStillReferenced(seed: string) {
  return primaryPlanIds.some((id) => id !== seed && generatedPlans.get(id)?.seed === seed);
}

function pruneStoredPlans() {
  while (primaryPlanIds.length > MAX_STORED_GENERATED_PLANS) {
    const idToPrune = primaryPlanIds.shift();

    if (!idToPrune) {
      return;
    }

    const plan = generatedPlans.get(idToPrune);

    generatedPlans.delete(idToPrune);

    if (plan && idToPrune !== plan.seed && !isPlanSeedStillReferenced(plan.seed)) {
      generatedPlans.delete(plan.seed);
    }
  }
}

export function saveGeneratedDatePlan(plan: GeneratedDatePlan, id = plan.seed): string {
  generatedPlans.set(id, plan);

  if (id !== plan.seed) {
    generatedPlans.set(plan.seed, plan);
  }

  rememberPrimaryPlanId(id, plan);
  pruneStoredPlans();

  currentPlanId = id;

  return id;
}

export function getGeneratedDatePlan(id: string): GeneratedDatePlan | undefined {
  return generatedPlans.get(id);
}

export function getCurrentGeneratedDatePlan(): GeneratedDatePlan | undefined {
  return currentPlanId ? generatedPlans.get(currentPlanId) : undefined;
}

export function getRecentGeneratedTemplateIds(limit = 5): string[] {
  const templateIds = new Set<string>();

  for (const planId of primaryPlanIds.slice().reverse()) {
    const plan = generatedPlans.get(planId);

    if (!plan || templateIds.has(plan.sourceTemplateId)) {
      continue;
    }

    templateIds.add(plan.sourceTemplateId);

    if (templateIds.size >= limit) {
      break;
    }
  }

  return Array.from(templateIds);
}
