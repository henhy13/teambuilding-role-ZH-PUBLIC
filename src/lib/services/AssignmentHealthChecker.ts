import { supabase } from '../supabase';
import { AssignmentSessionManager } from '../managers/AssignmentSessionManager';
import { AssignmentQueue } from './AssignmentQueue';
import Logger from '../utils/logger';

export class AssignmentHealthChecker {
  private static readonly STUCK_THRESHOLD = 300000; // 5 minutes
  private static readonly CHECK_INTERVAL = 120000; // 2 minutes
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the health checker to run automatically
   */
  static startHealthChecker(): void {
    if (this.intervalId) {
      Logger.warn('Health checker already running', 'AssignmentHealthChecker');
      return;
    }

    Logger.info('Starting assignment health checker', 'AssignmentHealthChecker');
    
    // Run immediately
    this.checkStuckTeams().catch(error => 
      Logger.error(`Initial health check failed: ${error}`, 'AssignmentHealthChecker')
    );

    // Then run periodically
    this.intervalId = setInterval(async () => {
      try {
        await this.checkStuckTeams();
      } catch (error) {
        Logger.error(`Health check failed: ${error}`, 'AssignmentHealthChecker');
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop the health checker
   */
  static stopHealthChecker(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.info('Assignment health checker stopped', 'AssignmentHealthChecker');
    }
  }

  /**
   * Check for stuck teams and attempt recovery
   */
  static async checkStuckTeams(): Promise<{
    checked: number;
    recovered: number;
    failed: number;
    details: Array<{ teamId: string; status: string; action: string; error?: string }>;
  }> {
    const results = {
      checked: 0,
      recovered: 0,
      failed: 0,
      details: [] as Array<{ teamId: string; status: string; action: string; error?: string }>
    };

    try {
      // Find teams stuck in processing states for too long
      const stuckThreshold = new Date(Date.now() - this.STUCK_THRESHOLD).toISOString();
      
      const { data: stuckSessions, error } = await supabase
        .from('assignment_sessions')
        .select('id, team_id, status, assignment, created_at')
        .in('status', ['scoring', 'assigning', 'justifying'])
        .lt('created_at', stuckThreshold);

      if (error) {
        Logger.error(`Error querying stuck teams: ${error.message}`, 'AssignmentHealthChecker');
        return results;
      }

      if (!stuckSessions || stuckSessions.length === 0) {
        Logger.debug('No stuck teams found', 'AssignmentHealthChecker');
        return results;
      }

      results.checked = stuckSessions.length;
      Logger.info(`Found ${stuckSessions.length} potentially stuck teams`, 'AssignmentHealthChecker');

      // Attempt to recover each stuck team
      for (const session of stuckSessions) {
        try {
          const recoveryResult = await this.recoverStuckTeam(session);
          results.details.push({
            teamId: session.team_id,
            status: session.status,
            action: recoveryResult.action,
            error: recoveryResult.error
          });

          if (recoveryResult.success) {
            results.recovered++;
          } else {
            results.failed++;
          }
        } catch (error) {
          Logger.error(`Error recovering team ${session.team_id}: ${error}`, 'AssignmentHealthChecker');
          results.failed++;
          results.details.push({
            teamId: session.team_id,
            status: session.status,
            action: 'recovery_failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      Logger.info(`Health check completed: ${results.recovered} recovered, ${results.failed} failed`, 'AssignmentHealthChecker');
      return results;

    } catch (error) {
      Logger.error(`Health check error: ${error}`, 'AssignmentHealthChecker');
      throw error;
    }
  }

  /**
   * Attempt to recover a specific stuck team
   */
  private static async recoverStuckTeam(session: {
    id: string;
    team_id: string;
    status: string;
    assignment: any;
    created_at: string;
  }): Promise<{ success: boolean; action: string; error?: string }> {
    
    const { id: sessionId, team_id: teamId, status, assignment } = session;
    const stuckDuration = Date.now() - new Date(session.created_at).getTime();
    
    Logger.info(`Attempting recovery for team ${teamId} (status: ${status}, stuck for: ${Math.round(stuckDuration / 1000)}s)`, 'AssignmentHealthChecker');

    try {
      switch (status) {
        case 'justifying':
          // Team is stuck generating justifications
          if (assignment && Object.keys(assignment).length > 0) {
            // Has assignments, mark as complete without justifications
            await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
            Logger.info(`Marked team ${teamId} as complete (justifications skipped)`, 'AssignmentHealthChecker');
            return { success: true, action: 'completed_without_justifications' };
          } else {
            // No assignments, retry the whole process
            await AssignmentSessionManager.updateSessionStatus(sessionId, 'pending');
            await AssignmentQueue.getInstance().addTeam(teamId);
            Logger.info(`Reset team ${teamId} to pending and re-queued`, 'AssignmentHealthChecker');
            return { success: true, action: 'reset_and_requeued' };
          }

        case 'scoring':
        case 'assigning':
          // Team is stuck in earlier phases, retry the whole process
          await AssignmentSessionManager.updateSessionStatus(sessionId, 'pending');
          await AssignmentQueue.getInstance().addTeam(teamId);
          Logger.info(`Reset team ${teamId} from ${status} to pending and re-queued`, 'AssignmentHealthChecker');
          return { success: true, action: 'reset_and_requeued' };

        default:
          Logger.warn(`Unknown status for team ${teamId}: ${status}`, 'AssignmentHealthChecker');
          return { success: false, action: 'unknown_status', error: `Unknown status: ${status}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to recover team ${teamId}: ${errorMessage}`, 'AssignmentHealthChecker');
      return { success: false, action: 'recovery_failed', error: errorMessage };
    }
  }

  /**
   * Get health statistics
   */
  static async getHealthStats(): Promise<{
    totalSessions: number;
    pendingSessions: number;
    processingSessions: number;
    completedSessions: number;
    stuckSessions: number;
    averageProcessingTime: number;
  }> {
    try {
      const { data: allSessions, error } = await supabase
        .from('assignment_sessions')
        .select('id, status, created_at');

      if (error) {
        throw new Error(`Error fetching session stats: ${error.message}`);
      }

      const sessions = allSessions || [];
      const now = Date.now();
      const stuckThreshold = now - this.STUCK_THRESHOLD;

      const stats = {
        totalSessions: sessions.length,
        pendingSessions: sessions.filter(s => s.status === 'pending').length,
        processingSessions: sessions.filter(s => ['scoring', 'assigning', 'justifying'].includes(s.status)).length,
        completedSessions: sessions.filter(s => s.status === 'complete').length,
        stuckSessions: sessions.filter(s => 
          ['scoring', 'assigning', 'justifying'].includes(s.status) &&
          new Date(s.created_at).getTime() < stuckThreshold
        ).length,
        averageProcessingTime: 0
      };

      // Calculate average processing time for completed sessions
      const completedWithTimes = sessions
        .filter(s => s.status === 'complete')
        .map(s => now - new Date(s.created_at).getTime());

      if (completedWithTimes.length > 0) {
        stats.averageProcessingTime = completedWithTimes.reduce((a, b) => a + b, 0) / completedWithTimes.length;
      }

      return stats;
    } catch (error) {
      Logger.error(`Error getting health stats: ${error}`, 'AssignmentHealthChecker');
      throw error;
    }
  }

  /**
   * Manual recovery for specific teams (for admin use)
   */
  static async manualRecovery(teamIds: string[]): Promise<Array<{
    teamId: string;
    success: boolean;
    action: string;
    error?: string;
  }>> {
    const results = [];

    for (const teamId of teamIds) {
      try {
        // Get the assignment session for this team
        const session = await AssignmentSessionManager.getAssignmentForTeam(teamId);
        
        if (!session) {
          results.push({
            teamId,
            success: false,
            action: 'no_session_found',
            error: 'No assignment session found for this team'
          });
          continue;
        }

        if (session.status === 'complete') {
          results.push({
            teamId,
            success: true,
            action: 'already_complete',
          });
          continue;
        }

        const recoveryResult = await this.recoverStuckTeam({
          id: session.id,
          team_id: teamId,
          status: session.status,
          assignment: session.assignment,
          created_at: session.createdAt.toISOString()
        });

        results.push({
          teamId,
          ...recoveryResult
        });

      } catch (error) {
        results.push({
          teamId,
          success: false,
          action: 'recovery_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}