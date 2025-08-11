import { NextApiRequest, NextApiResponse } from 'next';
import { AssignmentHealthChecker, Logger } from '@/lib';
import { ApiResponse } from '@/types';

interface RecoveryRequest {
  teamIds?: string[];
  runHealthCheck?: boolean;
}

interface RecoveryResponse {
  healthCheck?: {
    checked: number;
    recovered: number;
    failed: number;
    details: Array<{ teamId: string; status: string; action: string; error?: string }>;
  };
  manualRecovery?: Array<{
    teamId: string;
    success: boolean;
    action: string;
    error?: string;
  }>;
  healthStats?: {
    totalSessions: number;
    pendingSessions: number;
    processingSessions: number;
    completedSessions: number;
    stuckSessions: number;
    averageProcessingTime: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RecoveryResponse>>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    const { teamIds, runHealthCheck = true }: RecoveryRequest = req.body;

    Logger.info(`Recovery request: teamIds=${teamIds?.length || 0}, runHealthCheck=${runHealthCheck}`, 'RecoverStuckTeams');

    const response: RecoveryResponse = {};

    // Run automatic health check if requested
    if (runHealthCheck) {
      try {
        response.healthCheck = await AssignmentHealthChecker.checkStuckTeams();
        Logger.info(`Health check completed: ${response.healthCheck.recovered} recovered, ${response.healthCheck.failed} failed`, 'RecoverStuckTeams');
      } catch (error) {
        Logger.error(`Health check failed: ${error}`, 'RecoverStuckTeams');
        return res.status(500).json({
          success: false,
          error: `自動檢查失敗：${error instanceof Error ? error.message : '未知錯誤'}`
        });
      }
    }

    // Run manual recovery for specific teams if provided
    if (teamIds && teamIds.length > 0) {
      try {
        response.manualRecovery = await AssignmentHealthChecker.manualRecovery(teamIds);
        Logger.info(`Manual recovery completed for ${teamIds.length} teams`, 'RecoverStuckTeams');
      } catch (error) {
        Logger.error(`Manual recovery failed: ${error}`, 'RecoverStuckTeams');
        return res.status(500).json({
          success: false,
          error: `手動恢復失敗：${error instanceof Error ? error.message : '未知錯誤'}`
        });
      }
    }

    // Get current health stats
    try {
      response.healthStats = await AssignmentHealthChecker.getHealthStats();
    } catch (error) {
      Logger.warn(`Failed to get health stats: ${error}`, 'RecoverStuckTeams');
      // Don't fail the whole request for this
    }

    // Build response message
    let message = '恢復操作完成';
    const totalRecovered = (response.healthCheck?.recovered || 0) + 
                          (response.manualRecovery?.filter(r => r.success).length || 0);
    const totalFailed = (response.healthCheck?.failed || 0) + 
                       (response.manualRecovery?.filter(r => !r.success).length || 0);

    if (totalRecovered > 0) {
      message += `：${totalRecovered} 個團隊已恢復`;
    }
    
    if (totalFailed > 0) {
      message += `，${totalFailed} 個團隊恢復失敗`;
    }

    if (response.healthStats?.stuckSessions === 0) {
      message += '。目前沒有卡住的團隊。';
    } else if (response.healthStats?.stuckSessions) {
      message += `。仍有 ${response.healthStats.stuckSessions} 個團隊可能需要注意。`;
    }

    return res.status(200).json({
      success: true,
      data: response,
      message
    });

  } catch (error) {
    Logger.error(`Recovery API error: ${error}`, 'RecoverStuckTeams');
    return res.status(500).json({
      success: false,
      error: '恢復過程中發生內部伺服器錯誤'
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