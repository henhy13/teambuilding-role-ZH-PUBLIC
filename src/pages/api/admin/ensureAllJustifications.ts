import { NextApiRequest, NextApiResponse } from 'next';
import { TeamManager, AssignmentSessionManager, JustifierRunner, Logger } from '@/lib';
import { Team, TeamAssignment, RoleDefinition } from '@/types';
import { verifyAdminAuth } from './auth';

interface EnsureAllJustificationsResponse {
  success: boolean;
  data?: {
    totalTeams: number;
    completeTeams: number;
    teamsWithAssignments: number;
    teamsWithMissingJustifications: number;
    justificationsGenerated: number;
    errors: number;
    details: Array<{
      teamId: string;
      teamName: string;
      status: 'complete' | 'no_assignment' | 'incomplete' | 'justification_generated' | 'justification_failed';
      error?: string;
    }>;
  };
  error?: string;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnsureAllJustificationsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '不允許的請求方法',
      message: '僅允許POST請求方法'
    });
  }

  // Verify admin authentication
  const authResult = verifyAdminAuth(req);
  if (!authResult.isValid) {
    return res.status(401).json({
      success: false,
      error: authResult.error || 'Unauthorized',
      message: '未授權的請求'
    });
  }

  try {
    Logger.info('Starting comprehensive justification check and generation', 'EnsureJustifications');
    
    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API金鑰未配置',
        message: '生成說明需要OpenAI API金鑰'
      });
    }

    // Get all teams
    const allTeams = await TeamManager.getAllTeams();
    Logger.info(`Processing ${allTeams.length} total teams`, 'EnsureJustifications');

    const details: Array<{
      teamId: string;
      teamName: string;
      status: 'complete' | 'no_assignment' | 'incomplete' | 'justification_generated' | 'justification_failed';
      error?: string;
    }> = [];
    let completeTeams = 0;
    let teamsWithAssignments = 0;
    let teamsWithMissingJustifications = 0;
    let justificationsGenerated = 0;
    let errors = 0;

    // First pass: categorize teams and identify those needing justifications
    const teamsNeedingJustifications: Array<{
      team: Team;
      roles: RoleDefinition[];
      assignment: TeamAssignment;
      sessionId: string;
    }> = [];

    for (const team of allTeams) {
      if (!team.isComplete) {
        details.push({
          teamId: team.id,
          teamName: team.name,
          status: 'incomplete'
        });
        continue;
      }

      completeTeams++;
      
      const assignmentSession = await AssignmentSessionManager.getAssignmentForTeam(team.id);
      if (!assignmentSession || !assignmentSession.assignment) {
        details.push({
          teamId: team.id,
          teamName: team.name,
          status: 'no_assignment'
        });
        continue;
      }

      teamsWithAssignments++;
      const assignment = assignmentSession.assignment;
      
      // Check if justifications are missing or incomplete
      const needsJustifications = !assignment.justificationsGenerated || 
        assignment.assignments.some(assign => !assign.justification || assign.justification.trim() === '');

      if (!needsJustifications) {
        details.push({
          teamId: team.id,
          teamName: team.name,
          status: 'complete'
        });
        continue;
      }

      teamsWithMissingJustifications++;
      teamsNeedingJustifications.push({
        team,
        roles: assignmentSession.roles,
        assignment,
        sessionId: assignmentSession.id
      });
    }

    // Second pass: batch generate justifications for teams that need them
    if (teamsNeedingJustifications.length > 0) {
      Logger.info(`Generating justifications for ${teamsNeedingJustifications.length} teams using batch processing`, 'EnsureJustifications');
      
      const teams = teamsNeedingJustifications.map(t => t.team);
      const rolesArray = teamsNeedingJustifications.map(t => t.roles);
      const assignments = teamsNeedingJustifications.map(t => t.assignment);

      try {
        const batchResult = await JustifierRunner.generateJustificationsBatch(
          teams,
          rolesArray,
          assignments,
          openaiApiKey,
          {
            maxConcurrency: 3, // Conservative concurrency for admin operations
            retryFailedRequests: true
          }
        );

        // Process batch results
        for (let i = 0; i < teamsNeedingJustifications.length; i++) {
          const { team, sessionId } = teamsNeedingJustifications[i];
          const result = batchResult.results.find(r => r.teamId === team.id);
          
          if (result?.success && result.updatedAssignment) {
            // Update the assignment session
            const session = await AssignmentSessionManager.getAssignmentSession(sessionId);
            if (session) {
              session.assignment = result.updatedAssignment;
              await AssignmentSessionManager.updateAssignmentSession(sessionId, { status: 'complete' });
              Logger.info(`Successfully generated justifications for team ${team.id}`, 'EnsureJustifications');
            }
            
            details.push({
              teamId: team.id,
              teamName: team.name,
              status: 'justification_generated'
            });
            justificationsGenerated++;
          } else {
            Logger.error(`Failed to generate justifications for team ${team.id}: ${result?.error}`, 'EnsureJustifications');
            
            details.push({
              teamId: team.id,
              teamName: team.name,
              status: 'justification_failed',
              error: result?.error || 'Unknown error'
            });
            errors++;
          }
        }
      } catch (error) {
        Logger.error(`Batch processing error: ${error}`, 'EnsureJustifications');
        
        // Mark all teams as failed if batch processing fails
        for (const { team } of teamsNeedingJustifications) {
          details.push({
            teamId: team.id,
            teamName: team.name,
            status: 'justification_failed',
            error: error instanceof Error ? error.message : 'Batch processing failed'
          });
          errors++;
        }
      }
    }

    const responseData = {
      totalTeams: allTeams.length,
      completeTeams,
      teamsWithAssignments,
      teamsWithMissingJustifications,
      justificationsGenerated,
      errors,
      details
    };

    Logger.info(`Completed processing - Total: ${responseData.totalTeams}, Complete: ${responseData.completeTeams}, With assignments: ${responseData.teamsWithAssignments}, Missing justifications: ${responseData.teamsWithMissingJustifications}, Generated: ${responseData.justificationsGenerated}, Errors: ${responseData.errors}`, 'EnsureJustifications');

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Justification check completed: ${responseData.justificationsGenerated} justifications generated, ${responseData.errors} errors`
    });

  } catch (error) {
    Logger.error(`Error in ensure all justifications: ${error}`, 'EnsureJustifications');
    return res.status(500).json({
      success: false,
      error: '生成說明時發生內部伺服器錯誤',
      message: '無法確保所有說明生成完成'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};