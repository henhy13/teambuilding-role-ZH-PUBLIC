import { NextApiRequest, NextApiResponse } from 'next';
import { SessionManagerDB, Logger } from '@/lib';
import { ApiResponse, Session, SessionSummary } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: '會話ID為必填項目'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetSession(sessionId, req, res);
      case 'POST':
        return handleSessionAction(sessionId, req, res);
      case 'DELETE':
        return handleDeleteSession(sessionId, req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    Logger.error(`Session API error: ${error}`, 'SessionAPI');
    return res.status(500).json({
      success: false,
      error: '內部伺服器錯誤'
    });
  }
}

// GET /api/sessions/[sessionId] - Get session details
async function handleGetSession(
  sessionId: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const session = await SessionManagerDB.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: '找不到會話'
    });
  }

  return res.status(200).json({
    success: true,
    data: session
  });
}

// POST /api/sessions/[sessionId] - Handle session actions (end, archive)
async function handleSessionAction(
  sessionId: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { action, confirmEnd, clearMemory, exportData } = req.body;

  switch (action) {
    case 'end':
      if (!confirmEnd) {
        return res.status(400).json({
          success: false,
          error: '必須設定 confirmEnd: true 來確認結束會話'
        });
      }

      const endResult = await SessionManagerDB.endSession(sessionId, clearMemory);

      if (!endResult.success) {
        return res.status(400).json({
          success: false,
          error: endResult.error
        });
      }

      return res.status(200).json({
        success: true,
        data: endResult.data!,
        message: `Session ended${clearMemory ? ' and memory cleared' : ''}`
      });

    case 'archive':
      const archiveResult = await SessionManagerDB.archiveSession(sessionId);
      
      if (!archiveResult.success) {
        return res.status(400).json({
          success: false,
          error: archiveResult.error
        });
      }

      return res.status(200).json({
        success: true,
        data: { message: '會話歸檔成功' },
        message: '會話已歸檔'
      });

    default:
      return res.status(400).json({
        success: false,
        error: '無效的操作。支援的操作：end, archive'
      });
  }
}

// DELETE /api/sessions/[sessionId] - Delete session completely
async function handleDeleteSession(
  sessionId: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const result = await SessionManagerDB.deleteSession(sessionId);
  
  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: result.error
    });
  }

  return res.status(200).json({
    success: true,
    data: { message: '會話刪除成功' },
    message: '會話及所有相關資料已永久刪除'
  });
}