import { TeamManager } from '../managers/TeamManager';
import { ApplicantManager } from '../managers/ApplicantManager';
import { validateRequest, ApplicantSchema } from '../validation/schema';
import { Applicant } from '../../types';
import Logger from '../utils/logger';

export interface BulkApplicantData {
  teamId: string;
  applicant: Omit<Applicant, 'id' | 'submittedAt'>;
}

export interface BulkSubmitOptions {
  continueOnError?: boolean;
  validateTeamLimits?: boolean;
}

export interface BulkSubmitResult {
  teamId: string;
  applicantName: string;
  success: boolean;
  applicant?: Applicant;
  error?: string;
}

export interface BulkSubmitResponse {
  results: BulkSubmitResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    teamsAffected: number;
    completeTeams: number;
  };
  teamsStatus: Array<{
    teamId: string;
    teamName: string;
    currentCount: number;
    isComplete: boolean;
  }>;
}

export class BulkApplicantService {
  /**
   * Validate bulk applicant data
   */
  static validateApplications(
    applications: BulkApplicantData[],
    continueOnError: boolean = true
  ): { validatedApplications: BulkApplicantData[]; validationErrors: string[] } {
    const validationErrors: string[] = [];
    const validatedApplications: BulkApplicantData[] = [];

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      
      if (!app.teamId || typeof app.teamId !== 'string') {
        validationErrors.push(`申請 ${i + 1}：無效的團隊ID`);
        continue;
      }

      const validation = validateRequest(ApplicantSchema, app.applicant);
      if (!validation.success) {
        validationErrors.push(`申請 ${i + 1}：${validation.error}`);
        continue;
      }

      validatedApplications.push(app);
    }

    return { validatedApplications, validationErrors };
  }

  /**
   * Check team limits before processing
   */
  static async checkTeamLimits(
    validatedApplications: BulkApplicantData[],
    continueOnError: boolean = true
  ): Promise<{ teamLimitErrors: string[]; canProceed: boolean }> {
    const teamCounts = new Map<string, number>();
    
    // Count existing team sizes
    const uniqueTeamIds = [...new Set(validatedApplications.map(app => app.teamId))];
    for (const teamId of uniqueTeamIds) {
      const team = await TeamManager.getTeam(teamId);
      if (team) {
        teamCounts.set(teamId, team.applicants.length);
      }
    }

    // Count new applications per team
    const newApplicationCounts = new Map<string, number>();
    for (const app of validatedApplications) {
      newApplicationCounts.set(app.teamId, (newApplicationCounts.get(app.teamId) || 0) + 1);
    }

    // Check for teams that would exceed limits
    const teamLimitErrors: string[] = [];
    for (const [teamId, newCount] of newApplicationCounts) {
      const currentCount = teamCounts.get(teamId) || 0;
      if (currentCount + newCount > 10) {
        teamLimitErrors.push(`團隊 ${teamId} 將超過 10 人限制 (目前：${currentCount}，新增：${newCount})`);
      }
    }

    const canProceed = teamLimitErrors.length === 0 || continueOnError;
    return { teamLimitErrors, canProceed };
  }

  /**
   * Process bulk applicant submissions
   */
  static async processBulkSubmissions(
    validatedApplications: BulkApplicantData[]
  ): Promise<BulkSubmitResult[]> {
    const processingPromises = validatedApplications.map(async (app): Promise<BulkSubmitResult> => {
      try {
        // Check if team exists
        const team = await TeamManager.getTeam(app.teamId);
        if (!team) {
          return {
            teamId: app.teamId,
            applicantName: app.applicant.name,
            success: false,
            error: '找不到團隊'
          };
        }

        // Create applicant directly with team assignment (race condition safe)
        const createResult = await ApplicantManager.createApplicantWithTeam(team.sessionId, app.teamId, app.applicant);
        if (!createResult.success) {
          // Check if this is a team limit error (expected in high-concurrency scenarios)
          const isTeamLimitError = createResult.error?.includes('limit exceeded') || 
                                   createResult.error?.includes('已滿') ||
                                   createResult.error?.includes('Team member limit exceeded');
          
          if (isTeamLimitError) {
            Logger.info(`Team ${app.teamId} reached capacity during bulk submission - applicant ${app.applicant.name} rejected`, 'BulkApplicantService');
          } else {
            Logger.warn(`Failed to create applicant ${app.applicant.name} for team ${app.teamId}: ${createResult.error}`, 'BulkApplicantService');
          }
          
          return {
            teamId: app.teamId,
            applicantName: app.applicant.name,
            success: false,
            error: createResult.error
          };
        }

        return {
          teamId: app.teamId,
          applicantName: app.applicant.name,
          success: true,
          applicant: createResult.applicant
        };

      } catch (error) {
        return {
          teamId: app.teamId,
          applicantName: app.applicant.name,
          success: false,
          error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    });

    return await Promise.all(processingPromises);
  }

  /**
   * Get status of affected teams
   */
  static async getTeamsStatus(results: BulkSubmitResult[]): Promise<Array<{
    teamId: string;
    teamName: string;
    currentCount: number;
    isComplete: boolean;
  }>> {
    const affectedTeamIds = [...new Set(results.map(r => r.teamId))];
    return await Promise.all(
      affectedTeamIds.map(async (teamId) => {
        const team = await TeamManager.getTeam(teamId);
        return {
          teamId,
          teamName: team?.name || 'Unknown',
          currentCount: team?.applicants.length || 0,
          isComplete: team?.isComplete || false
        };
      })
    );
  }

  /**
   * Generate summary statistics
   */
  static generateSummary(
    results: BulkSubmitResult[],
    teamsStatus: Array<{ teamId: string; teamName: string; currentCount: number; isComplete: boolean }>
  ): {
    total: number;
    successful: number;
    failed: number;
    teamsAffected: number;
    completeTeams: number;
  } {
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const teamsAffected = new Set(results.map(r => r.teamId)).size;
    const completeTeams = teamsStatus.filter(t => t.isComplete).length;

    return {
      total: results.length,
      successful,
      failed,
      teamsAffected,
      completeTeams
    };
  }

  /**
   * Complete bulk submission process
   */
  static async submitBulkApplications(
    applications: BulkApplicantData[],
    options: BulkSubmitOptions = {}
  ): Promise<{ success: boolean; data?: BulkSubmitResponse; error?: string; validationErrors?: string[] }> {
    const {
      continueOnError = true,
      validateTeamLimits = true
    } = options;

    try {
      // Validate applications
      const { validatedApplications, validationErrors } = this.validateApplications(applications, continueOnError);
      
      if (validationErrors.length > 0 && !continueOnError) {
        return {
          success: false,
          error: `驗證錯誤：${validationErrors.join('; ')}`,
          validationErrors
        };
      }

      // Check team limits if requested
      if (validateTeamLimits) {
        const { teamLimitErrors, canProceed } = await this.checkTeamLimits(validatedApplications, continueOnError);
        
        if (!canProceed) {
          return {
            success: false,
            error: `團隊人數限制錯誤：${teamLimitErrors.join('; ')}`
          };
        }
      }

      // Process submissions
      const results = await this.processBulkSubmissions(validatedApplications);
      
      // Get teams status
      const teamsStatus = await this.getTeamsStatus(results);
      
      // Generate summary
      const summary = this.generateSummary(results, teamsStatus);

      const response: BulkSubmitResponse = {
        results,
        summary,
        teamsStatus
      };

      Logger.info(`Bulk submission completed: ${summary.successful}/${summary.total} successful, ${summary.teamsAffected} teams affected, ${summary.completeTeams} teams complete`, 'BulkApplicantService');

      return {
        success: summary.successful > 0,
        data: response,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (error) {
      Logger.error(`Bulk applicant service error: ${error}`, 'BulkApplicantService');
      return {
        success: false,
        error: '批次提交過程中發生內部伺服器錯誤'
      };
    }
  }
}