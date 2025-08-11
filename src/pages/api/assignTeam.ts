import type { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager, AssignmentSessionManager } from '../../lib/managers';
import { Scorer } from '../../lib/services/scorer';
import { Assigner } from '../../lib/services/assigner';
import { JustifierRunner } from '../../lib/services/JustifierRunner';
import { validateRequest, AssignTeamSchema } from '../../lib/validation/schema';
import { ApiResponse, AssignTeamRequest, TeamAssignment, Team, RoleDefinition } from '../../types';
import Logger from '../../lib/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ sessionId: string; assignment: TeamAssignment; justificationsPending: boolean }>>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    // Validate required environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API 金鑰未設定'
      });
    }

    // Validate request body
    const validation = validateRequest(AssignTeamSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { teamId } = validation.data;

    // Check if team exists and is complete
    const team = await TeamManager.getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '找不到團隊'
      });
    }

    if (!team.isComplete) {
      return res.status(400).json({
        success: false,
        error: `團隊必須滿員 (${team.applicants.length}/${team.maxMembers} 成員) 才能進行分配`
      });
    }

    // Create assignment session
    const sessionResult = await AssignmentSessionManager.createAssignmentSession(teamId);
    if (!sessionResult.success) {
      return res.status(400).json({
        success: false,
        error: sessionResult.error
      });
    }

    const session = sessionResult.session!;

    try {
      // Update session status to scoring
      await AssignmentSessionManager.updateSessionStatus(session.id, 'scoring');

      // Step 1: Generate score matrix using AI
      const scoringResult = await Scorer.generateScoreMatrix(team, session.roles, openaiApiKey);
      
      if (!scoringResult.success) {
        await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
        return res.status(500).json({
          success: false,
          error: `評分失敗：${scoringResult.error}`
        });
      }

      // Update session with score matrix
      session.scoreMatrix = scoringResult.scoreMatrix!;

      await AssignmentSessionManager.updateSessionStatus(session.id, 'assigning');

      // Step 2: Use Hungarian Algorithm for optimal assignment
      const assignmentResult = Assigner.assignRoles(team, session.roles, session.scoreMatrix);
      
      if (!assignmentResult.success) {
        await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
        return res.status(500).json({
          success: false,
          error: `分配失敗：${assignmentResult.error}`
        });
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
        Logger.error(`Failed to save assignment data: ${saveResult.error}`, 'AssignTeam');
        await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
        return res.status(500).json({
          success: false,
          error: `保存分配數據失敗：${saveResult.error}`
        });
      }
      
      await AssignmentSessionManager.updateSessionStatus(session.id, 'justifying');

      // Return immediate response with assignments
      const immediateResponse = res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          assignment: session.assignment,
          justificationsPending: true
        },
        message: '團隊分配成功！正在生成AI說明...'
      });

      // Step 3: Generate justifications in the background (don't await)
      generateJustificationsBackground(session.id, team, session.roles, session.assignment, openaiApiKey);

      return immediateResponse;

    } catch (error) {
      // Mark session as failed
      await AssignmentSessionManager.updateSessionStatus(session.id, 'pending');
      throw error;
    }

  } catch (error) {
    Logger.error(`Assign team error: ${error}`, 'AssignTeam');
    return res.status(500).json({
      success: false,
      error: '分配過程中發生內部伺服器錯誤'
    });
  }
}

// Background function to generate justifications
async function generateJustificationsBackground(
  sessionId: string,
  team: Team,
  roles: RoleDefinition[],
  assignment: TeamAssignment,
  openaiApiKey: string
) {
  try {
    Logger.info(`Generating justifications for session ${sessionId}...`, 'AssignTeam');
    
    const justificationResult = await JustifierRunner.generateJustificationsWithRetry(
      team,
      roles,
      assignment,
      openaiApiKey
    );

    if (justificationResult.success) {
      // Update session with justified assignment
      const session = await AssignmentSessionManager.getAssignmentSession(sessionId);
      if (session) {
        session.assignment = justificationResult.updatedAssignment!;
        Logger.info(`Justifications completed for session ${sessionId}`, 'AssignTeam');
        
        // Save the updated assignment with justifications to database
        const saveResult = await AssignmentSessionManager.saveAssignmentData(
          sessionId,
          session.assignment
        );
        
        if (saveResult.success) {
          Logger.info(`Justifications saved to database for session ${sessionId}`, 'AssignTeam');
        } else {
          Logger.error(`Failed to save justifications for session ${sessionId}: ${saveResult.error}`, 'AssignTeam');
        }
        
        // Mark as complete
        await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
      }
    } else {
      Logger.error(`Justification failed for session ${sessionId}: ${justificationResult.error}`, 'AssignTeam');
      // Mark as complete even if justifications failed - assignment is still valid
      await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
    }

  } catch (error) {
    Logger.error(`Background justification error for session ${sessionId}: ${error}`, 'AssignTeam');
    // Mark as complete even if justifications failed
    await AssignmentSessionManager.updateSessionStatus(sessionId, 'complete');
  }
}

// Export config for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};