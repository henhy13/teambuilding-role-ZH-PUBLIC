import type { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager } from '../../lib/managers';
import { ApiResponse, Team } from '../../types';
import { validateRequest, TeamSchema } from '../../lib/validation/schema';
import Logger from '../../lib/utils/logger';
import { AssignmentSessionManager } from '../../lib/managers/AssignmentSessionManager';

interface TeamWithStats extends Team {
  stats: {
    totalApplicants: number;
    isComplete: boolean;
    skills: string[];
    occupations: string[];
  };
  processingStatus?: string;
  processingMessage?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Team | TeamWithStats | Team[]>>
) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGetTeams(req, res);
      case 'POST':
        return handleCreateTeam(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: '不允許的請求方法'
        });
    }
  } catch (error) {
    Logger.error(`Teams API error: ${error}`, 'Teams');
    return res.status(500).json({
      success: false,
      error: '內部伺服器錯誤'
    });
  }
}

// Handle GET requests - list all teams or get specific team
async function handleGetTeams(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Team | TeamWithStats | Team[]>>
) {
  const { teamId, sessionId, includeAssignments } = req.query;

  if (teamId) {
    // Get specific team with stats
    if (typeof teamId !== 'string') {
      return res.status(400).json({
        success: false,
        error: '無效的團隊ID'
      });
    }

    const team = await TeamManager.getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '找不到團隊'
      });
    }

    // Calculate stats from team data
    const stats = {
      totalApplicants: team.applicants.length,
      isComplete: team.isComplete,
      skills: [...new Set(team.applicants.flatMap(a => a.skills))],
      occupations: [...new Set(team.applicants.map(a => a.occupation))]
    };

    const teamWithStats: TeamWithStats = {
      ...team,
      stats
    };

    return res.status(200).json({
      success: true,
      data: teamWithStats,
      message: `團隊 "${team.name}" 檢索成功`
    });
  } else {
    // List all teams, optionally filtered by sessionId
    let teams: Team[];
    
    if (sessionId && typeof sessionId === 'string') {
      Logger.info(`Getting teams for session: ${sessionId}`, 'Teams');
      teams = await TeamManager.getTeams(sessionId);
      Logger.info(`Found ${teams.length} teams for session ${sessionId}`, 'Teams');

      // If includeAssignments is requested, fetch assignment data in bulk
      if (includeAssignments === 'true') {
        return handleBulkTeamsWithAssignments(sessionId, teams, res);
      }
    } else {
      Logger.info('Getting all teams', 'Teams');
      // For now, we'll require sessionId since the DB method expects it
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: teams,
      message: `Retrieved ${teams.length} team(s)`
    });
  }
}

// New function to handle bulk teams with assignment data
async function handleBulkTeamsWithAssignments(
  sessionId: string,
  teams: Team[],
  res: NextApiResponse<ApiResponse<TeamWithStats[]>>
) {
  try {
    // Get assignment sessions for each team individually (more resilient than session-based query)
    const assignmentMap = new Map();
    
    // Query assignment sessions by team_id instead of session_id to avoid database inconsistencies
    await Promise.all(
      teams.map(async (team) => {
        try {
          const assignmentSession = await AssignmentSessionManager.getAssignmentForTeam(team.id);
          if (assignmentSession) {
            assignmentMap.set(team.id, assignmentSession);
          }
        } catch (error) {
          Logger.warn(`Failed to get assignment for team ${team.id}: ${error}`, 'Teams');
        }
      })
    );

    // Process teams with their assignment data (maintain order)
    const teamsWithStats: TeamWithStats[] = await Promise.all(
      teams.map(async (team, index) => {
        // Calculate basic stats
        const stats = {
          totalApplicants: team.applicants?.length || 0,
          isComplete: team.isComplete,
          skills: [...new Set((team.applicants || []).flatMap(a => a.skills || []))],
          occupations: [...new Set((team.applicants || []).map(a => a.occupation).filter(Boolean))]
        };

        let teamWithStats: TeamWithStats = {
          ...team,
          stats,
          applicants: team.applicants || []
        };

        // Add assignment data if available
        const assignmentSession = assignmentMap.get(team.id);
        if (assignmentSession) {
          teamWithStats.processingStatus = assignmentSession.status;
          teamWithStats.processingMessage = assignmentSession.status === 'complete' 
            ? '角色分配已完成' 
            : '正在生成角色分配...';

          // If assignments are complete, fetch the details using the same method as individual API
          if (assignmentSession.status === 'complete' && assignmentSession.assignment) {
            try {
              // Import Assigner to get assignment details (same as individual API)
              const { Assigner } = await import('../../lib/services/assigner');
              const detailsResult = Assigner.getAssignmentDetails(team, assignmentSession.roles, assignmentSession.assignment);
              
              if (detailsResult.success && detailsResult.details) {
                // Map assignment details to applicants
                const assignmentDetailMap = new Map();
                detailsResult.details.forEach((detail: any) => {
                  assignmentDetailMap.set(detail.applicant.id, {
                    assignedRole: detail.role.name,
                    compatibilityScore: detail.score,
                    justification: detail.justification
                  });
                });

                teamWithStats.applicants = (teamWithStats.applicants || []).map((applicant: any) => {
                  const assignment = assignmentDetailMap.get(applicant.id);
                  return {
                    ...applicant,
                    ...assignment
                  };
                });
              }
            } catch (error) {
              Logger.error(`Error loading assignment details for team ${team.id}: ${error}`, 'Teams');
            }
          }
        }

        return teamWithStats;
      })
    );

    // Ensure teams are sorted by creation time (preserve original order)
    teamsWithStats.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });

    return res.status(200).json({
      success: true,
      data: teamsWithStats,
      message: `Retrieved ${teamsWithStats.length} team(s) with assignment data`
    });

  } catch (error) {
    Logger.error(`Error in bulk teams with assignments: ${error}`, 'Teams');
    return res.status(500).json({
      success: false,
      error: '無法載入團隊和分配資料'
    });
  }
}

// Handle POST requests - create new team
async function handleCreateTeam(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Team>>
) {
  const validation = validateRequest(TeamSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  const { name, sessionId } = validation.data;

  const result = await TeamManager.createTeam(sessionId, name);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error
    });
  }

  return res.status(201).json({
    success: true,
    data: result.team!,
    message: `團隊 "${name}" 創建成功`
  });
}

// Export config for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};