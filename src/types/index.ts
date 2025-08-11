export interface Applicant {
  id: string;
  name: string;
  occupation: string;
  yearsOfExperience: number;
  experienceUnit?: 'years' | 'months'; // Optional for backward compatibility
  skills: string[];
  personalityTraits: string[];
  submittedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  applicants: Applicant[];
  createdAt: Date;
  isComplete: boolean; // true when has required number of applicants
  sessionId: string; // Link to session
  maxMembers: number; // Individual team member limit
}

export interface RoleDefinition {
  id: string;
  name: string; // e.g., "Role #1", "Role #2", etc.
  description?: string; // Optional for future use
}

export interface ScoreMatrix {
  teamId: string;
  scores: number[][]; // 10x10 matrix: scores[applicantIndex][roleIndex]
  generatedAt: Date;
}

export interface Assignment {
  applicantId: string;
  roleId: string;
  score: number;
  justification?: string; // AI-generated explanation
}

export interface TeamAssignment {
  teamId: string;
  assignments: Assignment[];
  totalScore: number;
  generatedAt: Date;
  justificationsGenerated: boolean;
}

export interface AssignmentSession {
  id: string;
  teamId: string;
  sessionId?: string; // Track which session this assignment belongs to for isolation
  roles: RoleDefinition[];
  scoreMatrix?: ScoreMatrix;
  assignment?: TeamAssignment;
  status: 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete';
  createdAt: Date;
}

// NEW: Session Management Types
export interface Session {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'ended' | 'archived';
  createdAt: Date;
  endedAt?: Date;
  createdBy: string; // Admin/dev identifier
  settings: SessionSettings;
  stats: SessionStats;
}

export interface TeamConfig {
  name: string;
  maxMembers: number;
}

export interface SessionSettings {
  maxTeams?: number; // Limit number of teams (default: unlimited)
  maxApplicantsPerTeam: number; // Default: 10
  allowSelfRegistration: boolean; // Can users create their own teams
  sessionCode?: string; // Optional join code for participants
  teamConfigs?: TeamConfig[]; // Individual team configurations
  raceMode?: boolean; // Toggle for part 2 (race) roles
}

export interface SessionStats {
  totalTeams: number;
  completeTeams: number;
  totalApplicants: number;
  assignedTeams: number;
  lastActivity: Date;
  averageTeamSize: number;
  pendingApplicants: number;
}

export interface SessionSummary {
  sessionId: string;
  sessionName: string;
  teams: Array<{
    teamId: string;
    teamName: string;
    memberCount: number;
    isComplete: boolean;
    hasAssignment: boolean;
    assignmentScore?: number;
  }>;
  overallStats: {
    totalParticipants: number;
    averageTeamScore?: number;
    completionRate: number;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SubmitApplicantRequest {
  sessionId: string; // NEW: Session context
  teamId: string;
  applicant: Omit<Applicant, 'id' | 'submittedAt'>;
}

export interface AssignTeamRequest {
  teamId: string;
}

// NEW: Session Management API Types
export interface CreateSessionRequest {
  name: string;
  description?: string;
  settings?: Partial<SessionSettings>;
  createdBy: string;
}

export interface UpdateSessionRequest {
  sessionId: string;
  name?: string;
  description?: string;
  settings?: Partial<SessionSettings>;
}

export interface EndSessionRequest {
  sessionId: string;
  confirmEnd: boolean;
  exportData?: boolean; // Whether to export session data before ending
}

export interface JoinSessionRequest {
  sessionCode?: string;
  sessionId?: string;
}

// OpenRouter API types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Batch operation types
export interface BatchAssignResult {
  teamId: string;
  sessionId?: string;
  success: boolean;
  error?: string;
  assignment?: TeamAssignment;
  justificationsPending?: boolean;
}

export interface BatchAssignResponse {
  results: BatchAssignResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    withJustifications: number;
  };
  processingTime: number;
}

// Justification types
export interface JustificationResponse {
  applicantId: string;
  justification: string;
}

export interface JustificationGenerationResult {
  teamId: string;
  teamName: string;
  success: boolean;
  error?: string;
}

// Assignment processing types
export interface AssignmentProcessingResult {
  success: boolean;
  data?: {
    sessionId: string;
    assignment: TeamAssignment;
    justificationsPending: boolean;
  };
  error?: string;
}

// Team with assignment details
export interface TeamWithAssignmentDetails {
  team: Team;
  roles: RoleDefinition[];
  assignment: TeamAssignment;
  sessionId: string;
}