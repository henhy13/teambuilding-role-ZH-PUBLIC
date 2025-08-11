import { AssignmentSessionManager } from '../managers/AssignmentSessionManager';
import { TeamManager } from '../managers/TeamManager';
import { Team, RoleDefinition, TeamAssignment, AssignmentProcessingResult } from '../../types';
import Logger from '../utils/logger';

export class AssignmentProcessor {
  // Automatically trigger assignment process for a team
  static async triggerAutoAssignment(teamId: string): Promise<void> {
    try {
      Logger.info(`Triggering automatic assignment for team ${teamId}`, 'AssignmentProcessor');
      
      // Call assignment logic directly instead of making HTTP request
      const result = await this.processTeamAssignment(teamId);
      
      if (result.success) {
        Logger.info(`Assignment triggered successfully for team ${teamId}`, 'AssignmentProcessor');
      } else {
        Logger.error(`Failed to trigger assignment for team ${teamId}: ${result.error}`, 'AssignmentProcessor');
        // Throw error so queue can catch it and retry
        throw new Error(result.error || 'Assignment processing failed');
      }
    } catch (error) {
      Logger.error(`Error triggering assignment for team ${teamId}: ${error}`, 'AssignmentProcessor');
      // Re-throw so queue can handle retry logic
      throw error;
    }
  }

  // Process team assignment logic (extracted from API handler)
  static async processTeamAssignment(teamId: string): Promise<AssignmentProcessingResult> {
    try {
      // Validate required environment variables
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          success: false,
          error: 'OpenAI API 金鑰未設定'
        };
      }

      // Check if team exists and is complete
      const team = await TeamManager.getTeam(teamId);
      if (!team) {
        return {
          success: false,
          error: '找不到團隊'
        };
      }

      if (!team.isComplete) {
        return {
          success: false,
          error: '團隊尚未滿員，無法進行分配'
        };
      }

      // Get or create assignment session
      let sessionResult = await AssignmentSessionManager.getAssignmentForTeam(teamId);
      if (!sessionResult) {
        const createResult = await AssignmentSessionManager.createAssignmentSession(teamId);
        if (!createResult.success) {
          return {
            success: false,
            error: createResult.error
          };
        }
        sessionResult = createResult.session!;
      }

      const session = sessionResult;

      // Import assignment modules dynamically to avoid circular dependencies
      const { Scorer } = await import('./scorer');
    const { Assigner } = await import('./assigner');
      const { JustifierRunner } = await import('./JustifierRunner');

      try {
        // Update session status to scoring
        await AssignmentSessionManager.updateSessionStatus(session.id, 'scoring');

        // Step 1: Generate score matrix using AI
        const scoringResult = await Scorer.generateScoreMatrix(team, session.roles, openaiApiKey);
        
        if (!scoringResult.success) {
          await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
          return {
            success: false,
            error: `評分失敗：${scoringResult.error}`
          };
        }

        // Update session with score matrix
        session.scoreMatrix = scoringResult.scoreMatrix!;
        await AssignmentSessionManager.updateSessionStatus(session.id, 'assigning');

        // Step 2: Use Hungarian Algorithm for optimal assignment
        const assignmentResult = Assigner.assignRoles(team, session.roles, session.scoreMatrix);
        
        if (!assignmentResult.success) {
          await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
          return {
            success: false,
            error: `分配失敗：${assignmentResult.error}`
          };
        }

        // Update session with assignment and save to database
        session.assignment = assignmentResult.assignment!;
        
        // Save assignment data to database
        const saveResult = await AssignmentSessionManager.saveAssignmentData(
          session.id,
          session.assignment,
          session.scoreMatrix || undefined
        );
        
        if (!saveResult.success) {
          await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
          return {
            success: false,
            error: `保存分配數據失敗：${saveResult.error}`
          };
        }
        
        await AssignmentSessionManager.updateSessionStatus(session.id, 'justifying');

        // Step 3: Generate justifications in the background (don't await)
        this.generateJustificationsBackground(session.id, team, session.roles, session.assignment, openaiApiKey);

        return {
          success: true,
          data: {
            sessionId: session.id,
            assignment: session.assignment,
            justificationsPending: true
          }
        };

      } catch (error) {
        // Mark session as failed
        await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
        throw error;
      }

    } catch (error) {
      Logger.error(`Process team assignment error: ${error}`, 'AssignmentProcessor');
      return {
        success: false,
        error: '分配過程中發生內部伺服器錯誤'
      };
    }
  }

  // Background function to generate justifications
  static async generateJustificationsBackground(
    sessionId: string,
    team: Team,
    roles: RoleDefinition[],
    assignment: TeamAssignment,
    openaiApiKey: string
  ): Promise<void> {
    const JUSTIFICATION_TIMEOUT = 120000; // 2 minutes timeout
    
    try {
      const { JustifierRunner } = await import('./JustifierRunner');
      
      // Add timeout wrapper to prevent infinite hanging
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<{ success: boolean; updatedAssignment?: TeamAssignment; error?: string }>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Justification generation timeout after 2 minutes')), JUSTIFICATION_TIMEOUT);
      });

      let justificationResult;
      try {
        justificationResult = await Promise.race([
          JustifierRunner.generateJustificationsWithRetry(team, roles, assignment, openaiApiKey),
          timeoutPromise
        ]);
      } finally {
        // Always cleanup timeout to prevent memory leaks
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }

      if (justificationResult.success) {
        // Update session with justified assignment
        const session = await AssignmentSessionManager.getAssignmentSession(sessionId);
        if (session) {
          session.assignment = justificationResult.updatedAssignment!;
          
          // Save the updated assignment with justifications to database
          const saveResult = await AssignmentSessionManager.saveAssignmentData(
            sessionId,
            session.assignment
          );
          
          if (!saveResult.success) {
            Logger.error(`Failed to save justifications for session ${sessionId}: ${saveResult.error}`, 'AssignmentProcessor');
            // Even if save fails, mark as complete - assignments are still usable
          }
          
          // Mark as complete
          await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
          Logger.info(`Successfully completed justifications for session ${sessionId}`, 'AssignmentProcessor');
        }
      } else {
        Logger.warn(`Failed to generate justifications for session ${sessionId}: ${justificationResult.error}. Marking as complete without justifications.`, 'AssignmentProcessor');
        
        // CRITICAL FIX: Mark as complete WITHOUT justifications
        // The assignments are still valid and usable, just without AI explanations
        await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
      }
    } catch (error) {
      Logger.error(`Error generating justifications for session ${sessionId}: ${error}`, 'AssignmentProcessor');
      
      // CRITICAL FIX: Always transition out of justifying status
      // This prevents teams from being stuck indefinitely
      try {
        await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
        Logger.info(`Marked session ${sessionId} as complete after justification error`, 'AssignmentProcessor');
      } catch (statusError) {
        Logger.error(`Failed to update status for session ${sessionId}: ${statusError}`, 'AssignmentProcessor');
      }
    }
  }
}