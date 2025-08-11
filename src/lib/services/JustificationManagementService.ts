import { TeamManager } from '../managers/TeamManager';
import { AssignmentSessionManager } from '../managers/AssignmentSessionManager';
import { JustifierRunner } from './JustifierRunner';
import { Team, TeamAssignment, RoleDefinition } from '../../types';
import Logger from '../utils/logger';

export interface MissingJustificationTeam {
  team: Team;
  roles: RoleDefinition[];
  assignment: TeamAssignment;
  sessionId: string;
}

export interface JustificationGenerationResult {
  teamId: string;
  teamName: string;
  success: boolean;
  error?: string;
}



export class JustificationManagementService {
  /**
   * Find teams that need justifications
   */
  static async findTeamsNeedingJustifications(): Promise<MissingJustificationTeam[]> {
    const allTeams = await TeamManager.getAllTeams();
    Logger.info(`Found ${allTeams.length} total teams`, 'JustificationManagementService');

    const teamsNeedingJustifications: MissingJustificationTeam[] = [];
    
    for (const team of allTeams) {
      if (!team.isComplete) {
        Logger.debug(`Skipping incomplete team: ${team.id}`, 'JustificationManagementService');
        continue;
      }

      const assignmentSession = await AssignmentSessionManager.getAssignmentForTeam(team.id);
      if (!assignmentSession || !assignmentSession.assignment) {
        Logger.debug(`Skipping team without assignment: ${team.id}`, 'JustificationManagementService');
        continue;
      }

      // Check if justifications are missing or incomplete
      const assignment = assignmentSession.assignment;
      const needsJustifications = !assignment.justificationsGenerated || 
        assignment.assignments.some(assign => !assign.justification || assign.justification.trim() === '');

      if (needsJustifications) {
        Logger.debug(`Team ${team.id} needs justifications`, 'JustificationManagementService');
        teamsNeedingJustifications.push({
          team,
          roles: assignmentSession.roles,
          assignment,
          sessionId: assignmentSession.id
        });
      }
    }

    Logger.info(`Found ${teamsNeedingJustifications.length} teams needing justifications`, 'JustificationManagementService');
    return teamsNeedingJustifications;
  }

  /**
   * Generate justifications for teams in batch
   */
  static async generateJustificationsForTeams(
    teamsNeedingJustifications: MissingJustificationTeam[],
    openaiApiKey: string,
    options: {
      maxConcurrency?: number;
      retryFailedRequests?: boolean;
    } = {}
  ): Promise<{
    results: JustificationGenerationResult[];
    successfulGenerations: number;
    failedGenerations: number;
  }> {
    const {
      maxConcurrency = 5,
      retryFailedRequests = true
    } = options;

    const teams = teamsNeedingJustifications.map(t => t.team);
    const rolesArray = teamsNeedingJustifications.map(t => t.roles);
    const assignments = teamsNeedingJustifications.map(t => t.assignment);

    Logger.info(`Starting batch justification generation for ${teams.length} teams...`, 'JustificationManagementService');
    
    const batchResult = await JustifierRunner.generateJustificationsBatch(
      teams,
      rolesArray,
      assignments,
      openaiApiKey,
      {
        maxConcurrency,
        retryFailedRequests
      }
    );

    // Update assignment sessions with results
    const results: JustificationGenerationResult[] = [];
    let successfulGenerations = 0;
    let failedGenerations = 0;

    for (let i = 0; i < teamsNeedingJustifications.length; i++) {
      const { team, sessionId } = teamsNeedingJustifications[i];
      const result = batchResult.results.find(r => r.teamId === team.id);
      
      if (result?.success && result.updatedAssignment) {
        // Update the assignment session
        const session = await AssignmentSessionManager.getAssignmentSession(sessionId);
        if (session) {
          session.assignment = result.updatedAssignment;
          await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
          Logger.debug(`Updated justifications for team ${team.id}`, 'JustificationManagementService');
        }
        
        results.push({
          teamId: team.id,
          teamName: team.name,
          success: true
        });
        successfulGenerations++;
      } else {
        Logger.error(`Failed to generate justifications for team ${team.id}: ${result?.error}`, 'JustificationManagementService');
        
        results.push({
          teamId: team.id,
          teamName: team.name,
          success: false,
          error: result?.error || 'Unknown error'
        });
        failedGenerations++;
      }
    }

    Logger.info(`Completed: ${successfulGenerations} successful, ${failedGenerations} failed`, 'JustificationManagementService');

    return {
      results,
      successfulGenerations,
      failedGenerations
    };
  }



  /**
   * Check if all teams have complete justifications
   */
  static async checkJustificationCompleteness(): Promise<{
    totalTeams: number;
    completeTeams: number;
    incompleteTeams: number;
    teamsWithoutAssignments: number;
  }> {
    const allTeams = await TeamManager.getAllTeams();
    let completeTeams = 0;
    let incompleteTeams = 0;
    let teamsWithoutAssignments = 0;

    for (const team of allTeams) {
      if (!team.isComplete) {
        continue; // Skip incomplete teams
      }

      const assignmentSession = await AssignmentSessionManager.getAssignmentForTeam(team.id);
      if (!assignmentSession || !assignmentSession.assignment) {
        teamsWithoutAssignments++;
        continue;
      }

      const assignment = assignmentSession.assignment;
      const hasCompleteJustifications = assignment.justificationsGenerated && 
        assignment.assignments.every(assign => assign.justification && assign.justification.trim() !== '');

      if (hasCompleteJustifications) {
        completeTeams++;
      } else {
        incompleteTeams++;
      }
    }

    return {
      totalTeams: allTeams.length,
      completeTeams,
      incompleteTeams,
      teamsWithoutAssignments
    };
  }
}