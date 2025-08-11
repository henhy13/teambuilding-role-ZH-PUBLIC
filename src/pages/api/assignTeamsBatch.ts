import type { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager, AssignmentSessionManager } from '../../lib/managers';
import { Scorer } from '../../lib/services/scorer';
import { Assigner } from '../../lib/services/assigner';
import { JustifierRunner } from '../../lib/services/JustifierRunner';
import { ApiResponse, Team, RoleDefinition, BatchAssignResponse, BatchAssignResult, TeamWithAssignmentDetails, AssignmentSession } from '../../types';
import Logger from '../../lib/utils/logger';

interface BatchAssignRequest {
  teamIds: string[];
  options?: {
    maxConcurrency?: number;
    includeJustifications?: boolean;
    retryFailedRequests?: boolean;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BatchAssignResponse>>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  const startTime = Date.now();

  try {
    // Validate required environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const {
      teamIds,
      options = {}
    }: BatchAssignRequest = req.body;

    const {
      maxConcurrency = 10,
      includeJustifications = true,
      retryFailedRequests = true
    } = options;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'teamIds陣列為必填項目且不能為空'
      });
    }

    if (teamIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: '單次批次最多可處理100個團隊'
      });
    }

    Logger.info(`Starting batch assignment for ${teamIds.length} teams`, 'AssignTeamsBatch');

    // Step 1: Validate all teams and create sessions
    const teams: Team[] = [];
    const sessions: AssignmentSession[] = [];
    const rolesArray: RoleDefinition[][] = [];

    for (let i = 0; i < teamIds.length; i++) {
      const teamId = teamIds[i];
      const team = await TeamManager.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({
          success: false,
          error: `找不到團隊: ${teamId}`
        });
      }

      if (!team.isComplete) {
        return res.status(400).json({
          success: false,
          error: `團隊 ${teamId} 必須滿員 (${team.applicants.length}/${team.maxMembers} 成員) 才能進行分配`
        });
      }

      // Get or create assignment session
      let assignmentSession = await AssignmentSessionManager.getAssignmentForTeam(teamId);
      
      if (!assignmentSession) {
        const sessionResult = await AssignmentSessionManager.createAssignmentSession(teamId);
        
        if (!sessionResult.success) {
          return res.status(400).json({
            success: false,
            error: `為團隊 ${teamId} 創建會話失敗：${sessionResult.error}`
          });
        }
        
        assignmentSession = sessionResult.session!;
      }

      teams.push(team);
      sessions.push(assignmentSession);
      rolesArray.push(assignmentSession.roles);
    }

    // Step 2: Batch generate score matrices using Promise.all
    Logger.info(`Generating score matrices for ${teams.length} teams...`, 'AssignTeamsBatch');
    
    for (const session of sessions) {
      await AssignmentSessionManager.updateSessionStatus(session.id, 'scoring');
    }

    const scoringResult = await Scorer.generateScoreMatricesBatch(
      teams,
      rolesArray,
      openaiApiKey,
      {
        maxConcurrency,
        retryFailedRequests
      }
    );

    // Step 3: Process assignments for successful scorings
    const assignmentResults: BatchAssignResult[] = [];
    const teamsWithAssignments: TeamWithAssignmentDetails[] = [];

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const session = sessions[i];
      const roles = rolesArray[i];
      const scoringData = scoringResult.results.find(r => r.teamId === team.id);

      if (scoringData?.success && scoringData.scoreMatrix) {
        // Update session with score matrix
        session.scoreMatrix = scoringData.scoreMatrix;
        await AssignmentSessionManager.updateSessionStatus(session.id, 'assigning');

        // Use Hungarian Algorithm for optimal assignment
        const assignmentResult = Assigner.assignRoles(team, roles, scoringData.scoreMatrix);
        
        if (assignmentResult.success) {
          session.assignment = assignmentResult.assignment!;
          await AssignmentSessionManager.updateSessionStatus(session.id, includeJustifications ? 'justifying' : 'complete');

          assignmentResults.push({
            teamId: team.id,
            sessionId: session.id,
            success: true,
            assignment: assignmentResult.assignment,
            justificationsPending: includeJustifications
          });

          if (includeJustifications) {
            teamsWithAssignments.push({
              team,
              roles,
              assignment: assignmentResult.assignment!,
              sessionId: session.id
            });
          }
        } else {
          await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
          assignmentResults.push({
            teamId: team.id,
            sessionId: session.id,
            success: false,
            error: `Assignment failed: ${assignmentResult.error}`
          });
        }
      } else {
        await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
        assignmentResults.push({
          teamId: team.id,
          sessionId: session.id,
          success: false,
          error: `評分失敗：${scoringData?.error || '未知錯誤'}`
        });
      }
    }

    // Step 4: Generate justifications in background if requested
    if (includeJustifications && teamsWithAssignments.length > 0) {
      Logger.info(`Generating justifications for ${teamsWithAssignments.length} teams in background...`, 'AssignTeamsBatch');
      
      // Don't await this - let it run in background
      generateBatchJustificationsBackground(
        teamsWithAssignments,
        openaiApiKey,
        { maxConcurrency, retryFailedRequests }
      );
    }

    // Prepare response
    const successful = assignmentResults.filter(r => r.success).length;
    const failed = assignmentResults.length - successful;
    const withJustifications = includeJustifications ? teamsWithAssignments.length : 0;
    const processingTime = Date.now() - startTime;

    const response: BatchAssignResponse = {
      results: assignmentResults,
      summary: {
        total: assignmentResults.length,
        successful,
        failed,
        withJustifications
      },
      processingTime
    };

    Logger.info(`Batch assignment completed: ${successful}/${assignmentResults.length} successful in ${processingTime}ms`, 'AssignTeamsBatch');

    return res.status(200).json({
      success: successful > 0,
      data: response,
      message: `批次分配完成：${successful}/${assignmentResults.length} 個團隊分配成功${includeJustifications ? '。正在背景生成說明。' : '。'}`
    });

  } catch (error) {
    Logger.error(`Batch assign teams error: ${error}`, 'AssignTeamsBatch');
    return res.status(500).json({
      success: false,
      error: '批次分配過程中發生內部伺服器錯誤'
    });
  }
}

// Background function to generate justifications for multiple teams
async function generateBatchJustificationsBackground(
  teamsWithAssignments: TeamWithAssignmentDetails[],
  openaiApiKey: string,
  options: { maxConcurrency: number; retryFailedRequests: boolean }
) {
  try {
    const teams = teamsWithAssignments.map(t => t.team);
    const rolesArray = teamsWithAssignments.map(t => t.roles);
    const assignments = teamsWithAssignments.map(t => t.assignment);

    Logger.info(`Starting background justification generation for ${teams.length} teams...`, 'AssignTeamsBatch');

    const justificationResult = await JustifierRunner.generateJustificationsBatch(
      teams,
      rolesArray,
      assignments,
      openaiApiKey,
      options
    );

    // Update sessions with justified assignments
    for (let i = 0; i < teamsWithAssignments.length; i++) {
      const { sessionId } = teamsWithAssignments[i];
      const result = justificationResult.results.find(r => r.teamId === teams[i].id);

      const session = await AssignmentSessionManager.getAssignmentSession(sessionId);
      if (session) {
        if (result?.success && result.updatedAssignment) {
          session.assignment = result.updatedAssignment;
          await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
          Logger.info(`Justifications completed for team ${teams[i].id}`, 'AssignTeamsBatch');
        } else {
          Logger.error(`Justification failed for team ${teams[i].id}: ${result?.error}`, 'AssignTeamsBatch');
          await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete'); // Mark complete even if justifications failed
        }
      }
    }

    Logger.info(`Background justification generation completed: ${justificationResult.summary.successful}/${justificationResult.summary.total} successful`, 'AssignTeamsBatch');

  } catch (error) {
    Logger.error(`Background batch justification error: ${error}`, 'AssignTeamsBatch');
    
    // Mark all sessions as complete even if justifications failed
    for (const { sessionId } of teamsWithAssignments) {
      await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
    }
  }
}

// Export config for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb', // Larger limit for batch requests
    },
    responseLimit: '10mb',
  },
};