import { NextApiRequest, NextApiResponse } from 'next';
import { SessionManagerDB } from '../../lib/managers/sessionManagerDB';
import { validateRequest, CreateSessionSchema, UpdateSessionSchema } from '../../lib/validation/schema';
import { ApiResponse, Session, CreateSessionRequest, UpdateSessionRequest } from '../../types';
import Logger from '../../lib/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGetSessions(req, res);
      case 'POST':
        return handleCreateSession(req, res);
      case 'PUT':
        return handleUpdateSession(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({
          success: false,
          error: `不允許的請求方法 ${req.method}`
        });
    }
  } catch (error) {
    Logger.error(`Sessions API error: ${error}`, 'Sessions');
    return res.status(500).json({
      success: false,
      error: '內部伺服器錯誤'
    });
  }
}

// GET /api/sessions - Get all sessions or filter by status
async function handleGetSessions(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { status } = req.query;
  
  let sessions: Session[];
  
  if (status === 'active') {
    sessions = await SessionManagerDB.getActiveSessions();
  } else {
    sessions = await SessionManagerDB.getAllSessions();
  }
  
  // Filter by status if provided and not 'active' (which is handled above)
  if (status && status !== 'active') {
    sessions = sessions.filter(s => s.status === status);
  }
  
  return res.status(200).json({
    success: true,
    data: sessions,
    message: `Retrieved ${sessions.length} sessions`
  });
}

// POST /api/sessions - Create a new session
async function handleCreateSession(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {


  const validation = validateRequest(CreateSessionSchema, req.body);
  if (!validation.success) {
    Logger.error(`Session creation validation error: ${validation.error}`, 'Sessions');
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  const { name, description, settings, createdBy, teamConfigs } = validation.data as CreateSessionRequest & { teamConfigs?: Array<{ name: string; maxMembers: number }> };
  

    try {
    const result = await SessionManagerDB.createSession(name, description || '', createdBy, settings || {}, teamConfigs);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || '創建會話失敗'
      });
    }

    const session = result.session!;
    Logger.info(`Session created successfully: ${session.id}`, 'Sessions');

    return res.status(201).json({
      success: true,
      data: session,
      message: `會話 "${name}" 創建成功，代碼: ${session.settings.sessionCode}`
    });
  } catch (error) {
    Logger.error(`Error creating session: ${error}`, 'Sessions');
    return res.status(500).json({
      success: false,
      error: `創建會話失敗：${error instanceof Error ? error.message : '未知錯誤'}`
    });
  }
}

// PUT /api/sessions - Update an existing session
async function handleUpdateSession(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const validation = validateRequest(UpdateSessionSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  const { sessionId, ...updates } = validation.data as UpdateSessionRequest;

  const result = await SessionManagerDB.updateSession(sessionId, updates);
  
  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: result.error
    });
  }

  return res.status(200).json({
    success: true,
    data: result.session!,
    message: '會話更新成功'
  });
}