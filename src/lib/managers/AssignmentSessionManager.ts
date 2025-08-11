import { AssignmentSession, TeamAssignment, ScoreMatrix } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { Database } from '../supabase';
import { TeamManager } from './TeamManager';
import Logger from '../utils/logger';
import { ROLE_DESCRIPTIONS } from '../validation/schema';

type AssignmentSessionRow = Database['public']['Tables']['assignment_sessions']['Row'];
type AssignmentSessionInsert = Database['public']['Tables']['assignment_sessions']['Insert'];

export class AssignmentSessionManager {
  // Create assignment session
  static async createAssignmentSession(
    teamId: string
  ): Promise<{ success: boolean; session?: AssignmentSession; error?: string }> {
    try {
      // Get team to extract session_id and roles
      const team = await TeamManager.getTeam(teamId);
      if (!team) {
        return { success: false, error: '找不到團隊' };
      }

      // Create default roles for assignment
      const defaultRoles = [
        '隊長', '總設計師', '技師', '輪胎經理', '駕駛',
        '安全責任者', '環境保護主任', '推車經理 1', '推車經理 2', '啦啦隊'
      ].map(name => ({
        id: uuidv4(),
        name,
        // Always provide Chinese descriptions for LLM scoring
        description: ROLE_DESCRIPTIONS[name] || ''
      }));

      const assignmentSessionData: AssignmentSessionInsert = {
        id: uuidv4(),
        team_id: teamId,
        session_id: team.sessionId,
        roles: defaultRoles,
        assignment: null,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('assignment_sessions')
        .insert(assignmentSessionData)
        .select('id, team_id, session_id, roles, assignment, status, created_at')
        .single();

      if (error) {
        // Check if this is a duplicate key error (unique constraint violation)
        if (error.code === '23505' && error.message.includes('team_id')) {
          // A session already exists for this team, try to fetch it
          const existingSession = await this.getAssignmentForTeam(teamId);
          if (existingSession) {
            Logger.info(`Assignment session already exists for team ${teamId}, returning existing: ${existingSession.id}`, 'AssignmentSessionManager');
            return { success: true, session: existingSession };
          }
        }
        Logger.error(`Error creating assignment session for team ${teamId}: ${error.message}`, 'AssignmentSessionManager');
        return { success: false, error: '創建分配會話失敗' };
      }

      const assignmentSession: AssignmentSession = {
        id: data.id,
        teamId: data.team_id,
        sessionId: data.session_id,
        roles: data.roles || [],
        assignment: data.assignment as TeamAssignment,
        status: data.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
        createdAt: new Date(data.created_at)
      };

      return { success: true, session: assignmentSession };
    } catch (error) {
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Get assignment sessions for a specific session
  static async getAssignmentSessionsForSession(sessionId: string): Promise<AssignmentSession[]> {
    try {
      const { data, error } = await supabase
        .from('assignment_sessions')
        .select('id, team_id, session_id, roles, score_matrix, assignment, status, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error(`Error fetching assignment sessions for session: ${error}`, 'AssignmentSessionManager');
        return [];
      }

      return data.map(row => ({
        id: row.id,
        teamId: row.team_id,
        sessionId: row.session_id,
        roles: row.roles || [],
        scoreMatrix: row.score_matrix as ScoreMatrix,
        assignment: row.assignment as TeamAssignment,
        status: row.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      Logger.error(`Error in getAssignmentSessionsForSession: ${error}`, 'AssignmentSessionManager');
      return [];
    }
  }

  // Get assignment for team
  static async getAssignmentForTeam(teamId: string): Promise<AssignmentSession | null> {
    try {
      const { data, error } = await supabase
        .from('assignment_sessions')
        .select('id, team_id, session_id, roles, score_matrix, assignment, status, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error(`Error fetching assignment for team: ${error}`, 'AssignmentSessionManager');
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // ALWAYS prioritize completed sessions over any other status, regardless of creation time
      const completedSessions = data.filter(row => row.status === 'complete');
      if (completedSessions.length > 0) {
        const latest = completedSessions[0]; // Already ordered by created_at desc
        Logger.debug(`Found completed session for team ${teamId}: ${latest.id}`, 'AssignmentSessionManager');
        return {
          id: latest.id,
          teamId: latest.team_id,
          sessionId: latest.session_id,
          roles: latest.roles || [],
          scoreMatrix: latest.score_matrix as ScoreMatrix,
          assignment: latest.assignment as TeamAssignment,
          status: latest.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
          createdAt: new Date(latest.created_at)
        };
      }

      // If no completed sessions, check for active processing sessions (scoring, assigning, justifying)
      const processingSessions = data.filter(row => 
        row.status === 'scoring' || row.status === 'assigning' || row.status === 'justifying'
      );
      if (processingSessions.length > 0) {
        const latest = processingSessions[0];
        Logger.debug(`Found processing session for team ${teamId}: ${latest.id} (status: ${latest.status})`, 'AssignmentSessionManager');
        return {
          id: latest.id,
          teamId: latest.team_id,
          sessionId: latest.session_id,
          roles: latest.roles || [],
          scoreMatrix: latest.score_matrix as ScoreMatrix,
          assignment: latest.assignment as TeamAssignment,
          status: latest.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
          createdAt: new Date(latest.created_at)
        };
      }

      // Only return pending sessions if no completed or processing sessions exist
      const pendingSessions = data.filter(row => row.status === 'pending');
      if (pendingSessions.length > 0) {
        const latest = pendingSessions[0];
        Logger.debug(`Found pending session for team ${teamId}: ${latest.id}`, 'AssignmentSessionManager');
        // Check if this pending session is stale (older than 10 minutes)
        const sessionAge = Date.now() - new Date(latest.created_at).getTime();
        const TEN_MINUTES = 10 * 60 * 1000;
        
        Logger.debug(`Session ${latest.id} age: ${Math.round(sessionAge / 60000)} minutes (created: ${latest.created_at})`, 'AssignmentSessionManager');
        
        if (sessionAge > TEN_MINUTES) {
          Logger.debug(`Pending session ${latest.id} is stale (${Math.round(sessionAge / 60000)} minutes old), will need auto-assignment trigger`, 'AssignmentSessionManager');
        } else {
          Logger.debug(`Session ${latest.id} is not stale yet (${Math.round(sessionAge / 60000)} minutes old, threshold: 10 minutes)`, 'AssignmentSessionManager');
        }
        
        return {
          id: latest.id,
          teamId: latest.team_id,
          sessionId: latest.session_id,
          roles: latest.roles || [],
          scoreMatrix: latest.score_matrix as ScoreMatrix,
          assignment: latest.assignment as TeamAssignment,
          status: latest.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
          createdAt: new Date(latest.created_at)
        };
      }

      // Fallback: return the most recent session if no specific status matches
      const latest = data[0];
      Logger.debug(`Returning fallback session for team ${teamId}: ${latest.id} (status: ${latest.status})`, 'AssignmentSessionManager');
      return {
        id: latest.id,
        teamId: latest.team_id,
        sessionId: latest.session_id,
        roles: latest.roles || [],
        scoreMatrix: latest.score_matrix as ScoreMatrix,
        assignment: latest.assignment as TeamAssignment,
        status: latest.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
        createdAt: new Date(latest.created_at)
      };
    } catch (error) {
      Logger.error(`Error in getAssignmentForTeam: ${error}`, 'AssignmentSessionManager');
      return null;
    }
  }

  // Get assignment session
  static async getAssignmentSession(assignmentSessionId: string): Promise<AssignmentSession | null> {
    try {
      const { data, error } = await supabase
        .from('assignment_sessions')
        .select('id, team_id, session_id, roles, score_matrix, assignment, status, created_at')
        .eq('id', assignmentSessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        Logger.error(`Error fetching assignment session: ${error}`, 'AssignmentSessionManager');
        return null;
      }

      return {
        id: data.id,
        teamId: data.team_id,
        sessionId: data.session_id,
        roles: data.roles || [],
        scoreMatrix: data.score_matrix as ScoreMatrix,
        assignment: data.assignment as TeamAssignment,
        status: data.status as 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete',
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      Logger.error(`Error in getAssignmentSession: ${error}`, 'AssignmentSessionManager');
      return null;
    }
  }

  // Update assignment session status
  static async updateSessionStatus(
    assignmentSessionId: string,
    status: 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('assignment_sessions')
        .update({ status })
        .eq('id', assignmentSessionId);

      if (error) {
        return { success: false, error: '更新會話狀態失敗' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Save assignment data to database
  static async saveAssignmentData(
    assignmentSessionId: string,
    assignment: TeamAssignment,
    scoreMatrix?: ScoreMatrix
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Partial<Database['public']['Tables']['assignment_sessions']['Update']> = {
        assignment: assignment as any
      };
      
      if (scoreMatrix) {
        updateData.score_matrix = scoreMatrix as any;
      }

      const { error } = await supabase
        .from('assignment_sessions')
        .update(updateData)
        .eq('id', assignmentSessionId);

      if (error) {
        Logger.error(`Error saving assignment data: ${error}`, 'AssignmentSessionManager');
        return { success: false, error: '保存分配數據失敗' };
      }

      return { success: true };
    } catch (error) {
      Logger.error(`Error in saveAssignmentData: ${error}`, 'AssignmentSessionManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Update assignment session with additional fields
  static async updateAssignmentSession(
    assignmentSessionId: string,
    updates: {
      status?: 'pending' | 'scoring' | 'assigning' | 'justifying' | 'complete';
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Partial<Database['public']['Tables']['assignment_sessions']['Update']> = {};
      
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }

      const { error } = await supabase
        .from('assignment_sessions')
        .update(updateData)
        .eq('id', assignmentSessionId);

      if (error) {
        Logger.error(`Error updating assignment session: ${error}`, 'AssignmentSessionManager');
        return { success: false, error: '更新分配會話失敗' };
      }

      return { success: true };
    } catch (error) {
      Logger.error(`Error in updateAssignmentSession: ${error}`, 'AssignmentSessionManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Clear session data
  static async clearSessionData(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove all applicants from teams (but don't delete applicants)
      await supabase
        .from('applicants')
        .update({ 
          team_id: null,
          assigned_role: null
        })
        .eq('session_id', sessionId);

      // Reset all teams
      await supabase
        .from('teams')
        .update({ 
          is_complete: false
        })
        .eq('session_id', sessionId);

      // Delete assignment sessions
      await supabase
        .from('assignment_sessions')
        .delete()
        .eq('session_id', sessionId);

      return { success: true };
    } catch (error) {
      Logger.error(`Error in clearSessionData: ${error}`, 'AssignmentSessionManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Cleanup old assignment sessions (maintenance method)
  static async cleanupOldSessions(maxAgeHours: number = 24): Promise<{ success: boolean; cleaned: number }> {
    try {
      const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      
      // Clean up old pending sessions or very old completed sessions
      const { data: oldPendingSessions, error: pendingError } = await supabase
        .from('assignment_sessions')
        .select('id, status, created_at')
        .eq('status', 'pending')
        .lt('created_at', cutoffTime.toISOString());

      const { data: oldCompletedSessions, error: completedError } = await supabase
        .from('assignment_sessions')
        .select('id, status, created_at')
        .eq('status', 'complete')
        .lt('created_at', sevenDaysAgo.toISOString());

      if (pendingError || completedError) {
        Logger.error(`Error fetching old assignment sessions: ${pendingError || completedError}`, 'AssignmentSessionManager');
        return { success: false, cleaned: 0 };
      }

      const sessionsToDelete = [...(oldPendingSessions || []), ...(oldCompletedSessions || [])];
      let cleanedCount = 0;

      for (const session of sessionsToDelete) {
        try {
          const ageHours = Math.round((Date.now() - new Date(session.created_at).getTime()) / 1000 / 60 / 60);
          Logger.debug(`Cleaning up old assignment session ${session.id} (status: ${session.status}, age: ${ageHours} hours)`, 'AssignmentSessionManager');
          
          const { error: deleteError } = await supabase
            .from('assignment_sessions')
            .delete()
            .eq('id', session.id);

          if (!deleteError) {
            cleanedCount++;
          }
        } catch (error) {
          Logger.error(`Error deleting assignment session ${session.id}: ${error}`, 'AssignmentSessionManager');
        }
      }

      return { success: true, cleaned: cleanedCount };
    } catch (error) {
      Logger.error(`Error in cleanupOldSessions: ${error}`, 'AssignmentSessionManager');
      return { success: false, cleaned: 0 };
    }
  }
}