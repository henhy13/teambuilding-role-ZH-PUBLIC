// Shared types to break circular dependencies between TeamManager and SessionManager

export interface TeamStats {
  totalTeams: number;
  completeTeams: number;
  totalApplicants: number;
  assignedTeams: number;
}

export interface SessionSummaryTeam {
  teamId: string;
  teamName: string;
  memberCount: number;
  isComplete: boolean;
  hasAssignment: boolean;
  assignmentScore?: number;
}

export interface ClearSessionResult {
  success: boolean;
  cleared?: {
    teams: number;
    assignments: number;
  };
  error?: string;
} 