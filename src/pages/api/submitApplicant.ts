import type { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager, ApplicantManager } from '../../lib/managers';
import { validateRequest, ApplicantSchema, SubmitApplicantSchema } from '../../lib/validation/schema';
import { ApiResponse, SubmitApplicantRequest, Applicant } from '../../types';
import Logger from '../../lib/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    // Validate request body - but make teamId optional for auto-assignment
    const validation = validateRequest(SubmitApplicantSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { sessionId, applicant: applicantData, teamId } = validation.data;

    let finalTeamId: string = teamId || '';
    
    // If no teamId provided, find an available team (auto-assignment)
    if (!teamId) {
      const availableTeams = await TeamManager.getTeams(sessionId);
      const teamWithSpace = availableTeams.find(team => !team.isComplete && team.applicants.length < team.maxMembers);
      
      if (!teamWithSpace) {
        return res.status(400).json({
          success: false,
          error: '目前沒有可用的團隊空位。請聯繫管理員創建新團隊。'
        });
      }
      
      finalTeamId = teamWithSpace.id;
    } else {
      // If teamId provided, validate it
      const team = await TeamManager.getTeam(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          error: '找不到團隊'
        });
      }

      // Check if team belongs to the session
      if (team.sessionId !== sessionId) {
        return res.status(400).json({
          success: false,
          error: '團隊不屬於此會話'
        });
      }

      // Check if team is full
      if (team.isComplete) {
        return res.status(400).json({
          success: false,
          error: '所選團隊已滿。請重新嘗試自動分配到其他團隊。'
        });
      }
    }

    // Create the applicant directly with team assignment
    const createResult = await ApplicantManager.createApplicantWithTeam(sessionId, finalTeamId!, applicantData);
    
    if (!createResult.success) {
      return res.status(400).json({
        success: false,
        error: createResult.error
      });
    }

    // Get updated team to check if complete
    const updatedTeam = await TeamManager.getTeam(finalTeamId!);
    
    return res.status(201).json({
      success: true,
      data: {
        applicant: createResult.applicant!,
        teamComplete: updatedTeam?.isComplete || false,
        teamName: updatedTeam?.name || '未知團隊'
      },
      message: updatedTeam?.isComplete 
        ? `成功加入 ${updatedTeam.name}！團隊現已滿員，準備進行角色分配。` 
        : `成功加入 ${updatedTeam?.name}！團隊目前有 ${updatedTeam?.applicants.length || 0} 名成員。`
    });

  } catch (error) {
    Logger.error(`Submit applicant error: ${error}`, 'SubmitApplicant');
    return res.status(500).json({
      success: false,
      error: '內部伺服器錯誤'
    });
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