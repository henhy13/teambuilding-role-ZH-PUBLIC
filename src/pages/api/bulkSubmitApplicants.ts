import { NextApiRequest, NextApiResponse } from 'next';
import { BulkApplicantService, BulkApplicantData, BulkSubmitResponse } from '../../lib/services/BulkApplicantService';
import { ApiResponse } from '../../types';
import Logger from '../../lib/utils/logger';

interface BulkSubmitRequest {
  applications: BulkApplicantData[];
  options?: {
    continueOnError?: boolean;
    validateTeamLimits?: boolean;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BulkSubmitResponse>>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    const {
      applications,
      options = {}
    }: BulkSubmitRequest = req.body;

    if (!applications || !Array.isArray(applications) || applications.length === 0) {
      return res.status(400).json({
        success: false,
        error: '申請陣列為必填項目且不能為空'
      });
    }

    if (applications.length > 500) {
      return res.status(400).json({
        success: false,
        error: '單次批次最多可處理 500 個申請'
      });
    }

    Logger.info(`Starting bulk submission of ${applications.length} applications`, 'BulkSubmitApplicants');

    // Use the service to handle the bulk submission
    const result = await BulkApplicantService.submitBulkApplications(applications, options);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Build response message
    const { data, validationErrors } = result;
    const { summary } = data!;
    
    let message = `批次提交完成：${summary.successful}/${summary.total} 個申請成功`;
    if (summary.completeTeams > 0) {
      message += `。${summary.completeTeams} 個團隊現已滿員並準備進行分配。`;
    }
    if (validationErrors && validationErrors.length > 0) {
      message += ` 遇到 ${validationErrors.length} 個驗證錯誤。`;
    }

    return res.status(summary.successful > 0 ? 200 : 400).json({
      success: summary.successful > 0,
      data,
      message
    });

  } catch (error) {
    Logger.error(`Bulk submit applicants error: ${error}`, 'BulkSubmitApplicants');
    return res.status(500).json({
      success: false,
      error: '批次提交過程中發生內部伺服器錯誤'
    });
  }
}

// Export config for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Large limit for bulk submissions
    },
  },
};