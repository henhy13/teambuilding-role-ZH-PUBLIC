import type { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager, AssignmentSessionManager } from '../../lib/managers';
import { AssignmentProcessor } from '../../lib/services/AssignmentProcessor';
import { Assigner, AssignmentDetail } from '../../lib/services/assigner';
import { ApiResponse, AssignmentSession } from '../../types';
import Logger from '../../lib/utils/logger';
// No validation schema needed for this endpoint

interface GetAssignmentsResponse {
  session: AssignmentSession;
  assignmentDetails?: AssignmentDetail[];
  stats?: {
    totalScore: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    scoreDistribution: { range: string; count: number }[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GetAssignmentsResponse>>
) {
  // Allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法'
    });
  }

  try {
    let teamId: string;
    let sessionId: string | undefined;

    // Handle different request methods
    if (req.method === 'GET') {
      teamId = req.query.teamId as string;
      sessionId = req.query.sessionId as string;
    } else {
      teamId = req.body.teamId;
      sessionId = req.body.sessionId;
    }

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: '團隊ID為必填項目'
      });
    }

    // Validate team exists
    const team = await TeamManager.getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '找不到團隊'
      });
    }

    // Session isolation: If sessionId is provided, validate it matches the team's session
    if (sessionId && team.sessionId !== sessionId) {
      return res.status(403).json({
        success: false,
        error: '拒絕存取：團隊不屬於指定的會話'
      });
    }

    // Get assignment session with session isolation
    let session: AssignmentSession | null;
    
    if (sessionId) {
      // Get assignment sessions for the specific session only
      const sessionAssignments = await AssignmentSessionManager.getAssignmentSessionsForSession(sessionId);
      session = sessionAssignments.find(s => s.teamId === teamId) || null;
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '在指定會話中找不到此團隊的分配會話'
        });
      }
    } else {
      // Get latest session for team (with implicit session isolation)
      session = await AssignmentSessionManager.getAssignmentForTeam(teamId);
      if (!session) {
        // Check if team is complete and auto-create assignment session
        if (team.isComplete) {
          const createResult = await AssignmentSessionManager.createAssignmentSession(teamId);
          if (createResult.success && createResult.session) {
            session = createResult.session;
            // Automatically trigger assignment for newly created session
            AssignmentProcessor.triggerAutoAssignment(teamId).catch((error: any) => {
              Logger.error(`Error triggering auto-assignment for team ${teamId}: ${error}`, 'GetAssignments');
            });
          } else {
            return res.status(500).json({
              success: false,
              error: '無法為完整團隊創建分配會話'
            });
          }
        } else {
          return res.status(404).json({
            success: false,
            error: '找不到此團隊的分配會話'
          });
        }
      } else if (session.status === 'pending' && team.isComplete) {
        // If we found a pending session for a complete team, trigger assignment
        AssignmentProcessor.triggerAutoAssignment(teamId).catch((error: any) => {
          Logger.error(`Error triggering auto-assignment for team ${teamId}: ${error}`, 'GetAssignments');
        });
      }
      
      // Additional validation: ensure the assignment belongs to the team's session
      if (session && session.sessionId && team.sessionId && session.sessionId !== team.sessionId) {
        return res.status(404).json({
          success: false,
          error: '找不到此團隊的有效分配會話'
        });
      }
    }

    // At this point, session should not be null due to early returns above
    if (!session) {
      return res.status(500).json({
        success: false,
        error: '內部錯誤：無法獲取分配會話'
      });
    }

    // Prepare response data
    const responseData: GetAssignmentsResponse = {
      session
    };

    // If assignment is complete, include detailed information
    if (session.assignment && session.status !== 'pending') {
      // Get assignment details with names
      const detailsResult = Assigner.getAssignmentDetails(team, session.roles, session.assignment);
      
      if (detailsResult.success) {
        responseData.assignmentDetails = detailsResult.details;
        responseData.stats = Assigner.getAssignmentStats(session.assignment);
      }
    }

    // Determine appropriate message based on status
    let message: string;
    switch (session.status) {
      case 'pending':
        message = '分配會話已創建，等待開始處理...';
        break;
      case 'scoring':
        message = 'AI is analyzing applicants and generating compatibility scores...';
        break;
      case 'assigning':
        message = 'Optimizing role assignments using Hungarian Algorithm...';
        break;
      case 'justifying':
        message = 'Assignment complete! Generating AI justifications...';
        break;
      case 'complete':
        const hasJustifications = session.assignment?.justificationsGenerated ?? false;
        message = hasJustifications 
          ? 'Assignment complete with AI justifications!'
          : 'Assignment complete! (Justifications may still be processing)';
        break;
      default:
        message = 'Assignment status unknown';
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      message
    });

  } catch (error) {
    Logger.error(`Get assignments error: ${error}`, 'GetAssignments');
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