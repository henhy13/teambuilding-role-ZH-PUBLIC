// src/lib/admin/sessionHelpers.ts

export function getTotalCapacity(teams: { maxMembers: number }[]): number {
  return teams.reduce((sum, team) => sum + team.maxMembers, 0);
}

export function formatTeamSummary(teams: { name: string; maxMembers: number }[]): string {
  return teams.map((t) => `${t.name} (${t.maxMembers})`).join(', ');
}
