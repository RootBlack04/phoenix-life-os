"use client";
import type { Mission } from "@/types";
import { GoalManager } from "@/components/goals/goal-manager";

export function ActiveMissions({ missions }: { missions: Mission[] }) {
  return <GoalManager missions={missions} overview />;
}
