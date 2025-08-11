import { NextApiRequest, NextApiResponse } from 'next';
import { SessionManagerDB, AssignmentSessionManager, Logger } from '@/lib';
import { verifyAdminAuth } from './auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const authResult = verifyAdminAuth(req);
  if (!authResult.isValid) {
    return res.status(401).json({ error: authResult.error || 'Unauthorized' });
  }

  try {
    const { forceAll } = req.body || {};
    
    // Clean up old ended sessions
    // If forceAll is true, remove all ended sessions regardless of age
    const maxAge = forceAll ? 0 : 1; // 0 hours = remove all ended sessions
    const sessionCleanup = await SessionManagerDB.cleanupEndedSessions(maxAge);
    
    // Clean up old assignment sessions
    const teamCleanup = await AssignmentSessionManager.cleanupOldSessions(1);

    return res.status(200).json({
      success: true,
      message: `Cleanup completed. Removed ${sessionCleanup.cleaned} ended sessions and ${teamCleanup.cleaned} old assignments.`,
      details: {
        sessions: sessionCleanup,
        assignments: teamCleanup,
        forced: forceAll || false
      }
    });

  } catch (error) {
    Logger.error(`Cleanup error: ${error}`, 'AdminCleanup');
    return res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}