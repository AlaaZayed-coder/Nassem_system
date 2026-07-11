"use server";

import { getAgendaForRole } from "@/lib/agenda-data";

export async function getAgendaAction(role: string) {
  return getAgendaForRole(role);
}
