import { Team, RoleDefinition, TeamAssignment } from '../../types';
import Logger from '../utils/logger';
import { JustifierService } from './JustifierService';

export class JustifierRunner {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

  // Generate justifications with retry logic
  static async generateJustificationsWithRetry(
    team: Team,
    roles: RoleDefinition[],
    assignment: TeamAssignment,
    openaiApiKey: string,
    retryCount: number = 0
  ): Promise<{ success: boolean; updatedAssignment?: TeamAssignment; error?: string }> {
    try {
      return await JustifierService.generateJustifications(team, roles, assignment, openaiApiKey);
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable && retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        Logger.warn(`Retrying justification for team ${team.id} (attempt ${retryCount + 1}/${this.MAX_RETRIES}) after ${delay}ms...`, 'JustifierRunner');
        
        await this.delay(delay);
        return this.generateJustificationsWithRetry(team, roles, assignment, openaiApiKey, retryCount + 1);
      }

      return { 
        success: false, 
        error: `理由生成在 ${retryCount} 次重試後失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Generate a single justification with retry
  static async generateSingleJustificationWithRetry(
    applicant: { id: string; name: string; occupation: string; yearsOfExperience: number; skills: string[]; personalityTraits: string[] },
    role: { id: string; name: string; description?: string },
    score: number,
    openaiApiKey: string,
    retryCount: number = 0
  ): Promise<{ success: boolean; justification?: string; error?: string }> {
    try {
      return await JustifierService.generateSingleJustification(applicant, role, score, openaiApiKey);
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable && retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
        Logger.warn(`Retrying single justification (attempt ${retryCount + 1}/${this.MAX_RETRIES}) after ${delay}ms...`, 'JustifierRunner');
        
        await this.delay(delay);
        return this.generateSingleJustificationWithRetry(applicant, role, score, openaiApiKey, retryCount + 1);
      }

      return { 
        success: false, 
        error: `單一理由生成在 ${retryCount} 次重試後失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Batch generate justifications for multiple teams using Promise.all
  static async generateJustificationsBatch(
    teams: Team[],
    rolesArray: RoleDefinition[][],
    assignments: TeamAssignment[],
    openaiApiKey: string,
    options: {
      maxConcurrency?: number;
      retryFailedRequests?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    results: Array<{
      teamId: string;
      success: boolean;
      updatedAssignment?: TeamAssignment;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const { maxConcurrency = 10, retryFailedRequests = true } = options;

    if (teams.length !== rolesArray.length || teams.length !== assignments.length) {
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0 }
      };
    }

    // Create batches to respect concurrency limits
    const teamBatches = this.createBatches(teams, maxConcurrency);
    const rolesBatches = this.createBatches(rolesArray, maxConcurrency);
    const assignmentBatches = this.createBatches(assignments, maxConcurrency);
    
    const allResults: Array<{
      teamId: string;
      success: boolean;
      updatedAssignment?: TeamAssignment;
      error?: string;
    }> = [];

    // Process batches sequentially, but items within each batch in parallel
    for (let i = 0; i < teamBatches.length; i++) {
      const teamBatch = teamBatches[i];
      const rolesBatch = rolesBatches[i];
      const assignmentBatch = assignmentBatches[i];

      Logger.info(`Processing justification batch ${i + 1}/${teamBatches.length} with ${teamBatch.length} teams`, 'JustifierRunner');

      // Use Promise.allSettled to handle failures gracefully
      const batchPromises = teamBatch.map((team, index) => 
        this.generateJustificationsWithRetry(
          team, 
          rolesBatch[index], 
          assignmentBatch[index], 
          openaiApiKey, 
          0
        )
          .then(result => ({
            teamId: team.id,
            ...result
          }))
          .catch(error => ({
            teamId: team.id,
            success: false,
            error: `批次處理錯誤：${error.message}`
          }))
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
        } else {
          allResults.push({
            teamId: 'unknown',
            success: false,
            error: `Promise failed: ${result.reason}`
          });
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i < teamBatches.length - 1) {
        await this.delay(500);
      }
    }

    // Retry failed requests if enabled
    if (retryFailedRequests) {
      const failedResults = allResults.filter(r => !r.success);
      if (failedResults.length > 0) {
        Logger.info(`Retrying ${failedResults.length} failed justification requests...`, 'JustifierRunner');
        
        const retryPromises = failedResults.map(async (failedResult) => {
          const teamIndex = teams.findIndex(t => t.id === failedResult.teamId);
          
          if (teamIndex >= 0) {
            await this.delay(Math.random() * 2000); // Random delay to spread load
            return this.generateJustificationsWithRetry(
              teams[teamIndex],
              rolesArray[teamIndex],
              assignments[teamIndex],
              openaiApiKey,
              0
            )
              .then(result => ({ teamId: teams[teamIndex].id, ...result }))
              .catch(error => ({
                teamId: teams[teamIndex].id,
                success: false,
                error: `Retry failed: ${error.message}`
              }));
          }
          return failedResult;
        });

        const retryResults = await Promise.allSettled(retryPromises);
        
        // Update results with retry outcomes
        retryResults.forEach((retryResult, index) => {
          if (retryResult.status === 'fulfilled') {
            const originalIndex = allResults.findIndex(r => r.teamId === failedResults[index].teamId);
            if (originalIndex >= 0) {
              allResults[originalIndex] = retryResult.value;
            }
          }
        });
      }
    }

    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.length - successful;

    return {
      success: successful > 0,
      results: allResults,
      summary: {
        total: allResults.length,
        successful,
        failed
      }
    };
  }

  // Generate justifications with metrics
  static async generateJustificationsWithMetrics(
    team: Team,
    roles: RoleDefinition[],
    assignment: TeamAssignment,
    openaiApiKey: string
  ): Promise<{
    success: boolean;
    updatedAssignment?: TeamAssignment;
    error?: string;
    metrics: {
      startTime: number;
      endTime: number;
      duration: number;
      retryCount: number;
    };
  }> {
    const startTime = Date.now();
    let retryCount = 0;

    const result = await this.generateJustificationsWithRetry(
      team,
      roles,
      assignment,
      openaiApiKey,
      retryCount
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      ...result,
      metrics: {
        startTime,
        endTime,
        duration,
        retryCount
      }
    };
  }

  // Utility methods for batch processing
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static isRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const isNetworkError = errorMessage.includes('network') || 
                          errorMessage.includes('timeout') || 
                          errorMessage.includes('fetch');
    
    const isRateLimited = errorMessage.includes('rate limit') || 
                         errorMessage.includes('429') ||
                         errorMessage.includes('too many requests');
    
    const isServerError = errorMessage.includes('500') || 
                         errorMessage.includes('502') || 
                         errorMessage.includes('503') || 
                         errorMessage.includes('504');

    return isNetworkError || isRateLimited || isServerError;
  }
}