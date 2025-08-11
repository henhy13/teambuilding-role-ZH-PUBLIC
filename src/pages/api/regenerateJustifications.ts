import { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager, AssignmentSessionManager } from '../../lib/managers';
import { JustifierRunner } from '../../lib/services/JustifierRunner';
import { ApiResponse, JustificationGenerationResult } from '../../types';
import Logger from '../../lib/utils/logger';

interface RegenerateJustificationsResponse {
  teamId: string;
  sessionId: string;
  justificationsGenerated: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RegenerateJustificationsResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: '團隊ID為必填項目'
      });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Get team data
    const team = await TeamManager.getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '找不到團隊'
      });
    }

    // Get assignment session
    const session = await AssignmentSessionManager.getAssignmentForTeam(teamId);
    
    if (!session || !session.assignment) {
      return res.status(404).json({
        success: false,
        error: '找不到此團隊的分配'
      });
    }

    Logger.info(`Regenerating justifications for team ${teamId}...`, 'RegenerateJustifications');

    // Generate justifications
    const result = await JustifierRunner.generateJustificationsWithRetry(
      team,
      session.roles,
      session.assignment,
      openaiApiKey
    );

    if (result.success && result.updatedAssignment) {
      // Update the session with justified assignment
      session.assignment = result.updatedAssignment;
      await AssignmentSessionManager.updateSessionStatus(session.id, 'complete');
      
      Logger.info(`Justifications regenerated successfully for team ${teamId}`, 'RegenerateJustifications');
      
      return res.status(200).json({
        success: true,
        data: {
          teamId,
          sessionId: session.id,
          justificationsGenerated: true
        },
        message: '說明重新生成成功'
      });
    } else {
      Logger.error(`Justification regeneration failed for team ${teamId}: ${result.error}`, 'RegenerateJustifications');
      
      return res.status(500).json({
        success: false,
        error: `Justification generation failed: ${result.error}`
      });
    }

  } catch (error) {
    Logger.error(`Regenerate justifications error: ${error}`, 'RegenerateJustifications');
    return res.status(500).json({
      success: false,
      error: '重新生成理由過程中發生內部伺服器錯誤'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};