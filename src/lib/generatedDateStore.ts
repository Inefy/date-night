// src/lib/generatedDateStore.ts
import type { GeneratedDatePlan } from '@/types/domain';

const generatedPlans = new Map<string, GeneratedDatePlan>();
let currentPlanId: string | undefined;

export function saveGeneratedDatePlan(plan: GeneratedDatePlan, id = plan.seed): string {
  generatedPlans.set(id, plan);

  if (id !== plan.seed) {
    generatedPlans.set(plan.seed, plan);
  }

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
  return Array.from(generatedPlans.values())
    .slice(-limit)
    .reverse()
    .map((plan) => plan.sourceTemplateId);
}
