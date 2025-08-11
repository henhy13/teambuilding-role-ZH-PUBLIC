import { NextApiRequest, NextApiResponse } from 'next';
import { SessionManagerDB, validateRequest, Logger } from '@/lib';
import { ApiResponse, Session, JoinSessionRequest } from '@/types';
import { z } from 'zod';

const JoinSessionSchema = z.object({
  sessionCode: z.string().optional(),
  sessionId: z.string().optional(),
}).refine(
  (data) => data.sessionCode || data.sessionId,
  {
    message: "必須提供會話代碼或會話ID",
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    const validation = validateRequest(JoinSessionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { sessionCode, sessionId } = validation.data as JoinSessionRequest;

    let session: Session | null = null;

    // Try to find session by code first, then by ID
    if (sessionCode) {
      session = await SessionManagerDB.getSessionByCode(sessionCode);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '無效的會話代碼'
        });
      }
    } else if (sessionId) {
      session = await SessionManagerDB.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '找不到會話'
        });
      }
    }

    // Check if session is active
    if (session!.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `會話狀態為 ${session!.status}，不接受新參與者`
      });
    }

    return res.status(200).json({
      success: true,
      data: session!,
      message: `成功加入會話: ${session!.name}`
    });

  } catch (error) {
    Logger.error(`Join session error: ${error}`, 'JoinSession');
    return res.status(500).json({
      success: false,
      error: '內部伺服器錯誤'
    });
  }
}