import { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager } from '../../lib/managers';
import { ApiResponse } from '../../types';
import Logger from '../../lib/utils/logger';

interface ResetTeamRequest {
  teamId: string;
  confirmReset?: boolean; // Safety flag to prevent accidental resets
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ teamId: string; message: string }>>
) {
  // Only allow POST requests for safety
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    const { teamId, confirmReset }: ResetTeamRequest = req.body;

    // Validate required fields
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: '團隊ID為必填項目'
      });
    }

    // Safety check - require explicit confirmation
    if (!confirmReset) {
      return res.status(400).json({
        success: false,
        error: '需要重置確認。請設定 confirmReset: true 以繼續。'
      });
    }

    // Check if team exists
    const team = await TeamManager.getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '找不到團隊'
      });
    }

    // Store team info before reset for response
    const applicantCount = team.applicants.length;
    const teamName = team.name;

    // Reset the team
    const resetResult = await TeamManager.resetTeam(teamId);
    if (!resetResult.success) {
      return res.status(500).json({
        success: false,
        error: resetResult.error || '重置團隊失敗'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        teamId,
        message: `團隊「${teamName}」已重置。已移除 ${applicantCount} 名申請者和所有分配會話。`
      },
      message: '團隊重置成功'
    });

  } catch (error) {
    Logger.error(`Reset team error: ${error}`, 'ResetTeam');
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