import { Session, SessionSettings, SessionStats, SessionSummary } from '../../types';
import { TeamStats, ClearSessionResult } from '../shared-types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { Database } from '../supabase';
import Logger from '../utils/logger';

type SessionRow = Database['public']['Tables']['sessions']['Row'];
type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
type SessionUpdate = Database['public']['Tables']['sessions']['Update'];

export class SessionManagerDB {
  // Create a new session
  static async createSession(
    name: string,
    description: string = '',
    createdBy: string = 'admin',
    settings: Partial<SessionSettings> = {},
    teamConfigs?: Array<{ name: string; maxMembers: number }>
  ): Promise<{ success: boolean; session?: Session; error?: string }> {
    try {
      const sessionId = uuidv4();
      // Use custom session code from settings if provided, otherwise generate one
      const code = settings.sessionCode || this.generateSessionCode();
      
      const defaultSettings: SessionSettings = {
        maxApplicantsPerTeam: 10,
        allowSelfRegistration: true,
        sessionCode: code,
        ...settings
      };

      const sessionData: SessionInsert = {
        id: sessionId,
        name,
        description,
        session_code: code,
        status: 'active',
        created_by: createdBy,
        settings: defaultSettings,
        stats: {
          totalApplicants: 0,
          totalTeams: 0,
          averageTeamSize: 0,
          completedTeams: 0,
          pendingApplicants: 0
        }
      };

      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select('id, name, description, status, created_at, ended_at, created_by, settings, stats, session_code')
        .single();

      if (error) {
        Logger.error(`Error creating session: ${error}`, 'SessionManagerDB');
        return { success: false, error: '創建會話失敗' };
      }

      const session: Session = this.mapRowToSession(data);

      // Store team configs if provided
      if (teamConfigs && teamConfigs.length > 0) {
        const teamInserts = teamConfigs.map(config => ({
          id: uuidv4(),
          session_id: sessionId,
          name: config.name,
          max_members: config.maxMembers,
          is_complete: false
        }));

        const { error: teamError } = await supabase
          .from('teams')
          .insert(teamInserts);

        if (teamError) {
          Logger.error(`Error creating teams: ${teamError}`, 'SessionManagerDB');
          // Don't fail the session creation, just log the error
        }
      }

      return { success: true, session };
    } catch (error) {
      Logger.error(`Error in createSession: ${error}`, 'SessionManagerDB');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Get all sessions
  static async getAllSessions(): Promise<Session[]> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, description, status, created_at, ended_at, created_by, settings, stats, session_code')
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error(`Error fetching sessions: ${error}`, 'SessionManagerDB');
        return [];
      }

      return data.map(row => this.mapRowToSession(row));
    } catch (error) {
      Logger.error(`Error in getAllSessions: ${error}`, 'SessionManagerDB');
      return [];
    }
  }

  // Get active sessions
  static async getActiveSessions(): Promise<Session[]> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, description, status, created_at, ended_at, created_by, settings, stats, session_code')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error(`Error fetching active sessions: ${error}`, 'SessionManagerDB');
        return [];
      }

      return data.map(row => this.mapRowToSession(row));
    } catch (error) {
      Logger.error(`Error in getActiveSessions: ${error}`, 'SessionManagerDB');
      return [];
    }
  }

  // Get session by ID
  static async getSession(sessionId: string): Promise<Session | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, description, status, created_at, ended_at, created_by, settings, stats, session_code')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        Logger.error(`Error fetching session: ${error}`, 'SessionManagerDB');
        return null;
      }

      return this.mapRowToSession(data);
    } catch (error) {
      Logger.error(`Error in getSession: ${error}`, 'SessionManagerDB');
      return null;
    }
  }

  // Get session by code
  static async getSessionByCode(code: string): Promise<Session | null> {
    try {
      const { data, error } = await supabase
         .from('sessions')
         .select('id, name, description, status, created_at, ended_at, created_by, settings, stats, session_code')
         .eq('session_code', code.toUpperCase())
         .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        Logger.error(`Error fetching session by code: ${error}`, 'SessionManagerDB');
        return null;
      }

      return this.mapRowToSession(data);
    } catch (error) {
      Logger.error(`Error in getSessionByCode: ${error}`, 'SessionManagerDB');
      return null;
    }
  }

  // Update session
  static async updateSession(
    sessionId: string,
    updates: Partial<Pick<Session, 'name' | 'description'>> & { settings?: Partial<SessionSettings> }
  ): Promise<{ success: boolean; session?: Session; error?: string }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: '找不到會話' };
      }

      if (session.status === 'ended') {
        return { success: false, error: '無法更新已結束的會話' };
      }

      const updateData: SessionUpdate = {};
      
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      
      if (updates.settings) {
        updateData.settings = {
          ...session.settings,
          ...updates.settings
        };
      }

      const { data, error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select('id, name, description, status, created_at, ended_at, created_by, settings, stats, session_code')
        .single();

      if (error) {
        Logger.error(`Error updating session: ${error}`, 'SessionManagerDB');
        return { success: false, error: '更新會話失敗' };
      }

      return { success: true, session: this.mapRowToSession(data) };
    } catch (error) {
      Logger.error(`Error in updateSession: ${error}`, 'SessionManagerDB');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // End session
  static async endSession(
    sessionId: string,
    clearMemory: boolean = false
  ): Promise<{ success: boolean; data?: SessionSummary; error?: string }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: '找不到會話' };
      }

      if (session.status === 'ended') {
        return { success: false, error: '會話已結束' };
      }

      // Update session status to ended
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        Logger.error(`Error ending session: ${updateError}`, 'SessionManagerDB');
        return { success: false, error: '結束會話失敗' };
      }

      // Get session summary
      const summary = await this.getSessionSummary(sessionId);

      // Clear memory if requested
      if (clearMemory) {
        await this.clearSessionMemory(sessionId);
      }

      return { success: true, data: summary };
    } catch (error) {
      Logger.error(`Error in endSession: ${error}`, 'SessionManagerDB');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Get session summary
  static async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('找不到會話');
      }

      // Get teams with their applicants
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          is_complete,
          applicants (
            id,
            name,
            email,
            assigned_role,
            skills,
            preferences,
            score,
            team_id
          )
        `)
        .eq('session_id', sessionId);

      if (teamsError) {
        Logger.error(`Error fetching teams for summary: ${teamsError}`, 'SessionManagerDB');
        throw new Error('獲取團隊失敗');
      }

      const teams = teamsData.map(team => ({
        id: team.id,
        name: team.name,
        members: team.applicants.map((applicant) => ({
          id: applicant.id,
          name: applicant.name,
          email: applicant.email,
          role: (applicant as any).assigned_role || 'unassigned',
          skills: (applicant as any).skills || [],
          preferences: (applicant as any).preferences || [],
          score: (applicant as any).score || 0
        })),
        isComplete: team.is_complete,
        averageScore: team.applicants.length > 0 
          ? team.applicants.reduce((sum: number, a) => sum + ((a as any).score || 0), 0) / team.applicants.length 
          : 0
      }));

      return {
        sessionId: session.id,
        sessionName: session.name,
        teams: await Promise.all(teams.map(async team => {
          // Check if team has assignment
          const { data: assignment } = await supabase
            .from('assignment_sessions')
            .select('id')
            .eq('team_id', team.id)
            .single();
          
          return {
            teamId: team.id,
            teamName: team.name,
            memberCount: team.members.length,
            isComplete: team.isComplete,
            hasAssignment: !!assignment,
            assignmentScore: team.averageScore
          };
        })),
        overallStats: {
          totalParticipants: teams.reduce((sum, t) => sum + t.members.length, 0),
          averageTeamScore: this.calculateAverageTeamScore(teams),
          completionRate: teams.length > 0 ? (teams.filter(t => t.isComplete).length / teams.length) * 100 : 0
        }
      };
    } catch (error) {
      Logger.error(`Error in getSessionSummary: ${error}`, 'SessionManagerDB');
      // Return basic summary on error
      return {
        sessionId,
        sessionName: 'Unknown',
        teams: [],
        overallStats: {
          totalParticipants: 0,
          averageTeamScore: undefined,
          completionRate: 0
        }
      };
    }
  }

  // Delete session
  static async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete all related data first (cascading should handle this, but being explicit)
      await supabase.from('applicants').delete().eq('session_id', sessionId);
      await supabase.from('assignment_sessions').delete().eq('session_id', sessionId);
      await supabase.from('teams').delete().eq('session_id', sessionId);
      
      // Delete the session
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        Logger.error(`Error deleting session: ${error}`, 'SessionManagerDB');
        return { success: false, error: '刪除會話失敗' };
      }

      return { success: true };
    } catch (error) {
      Logger.error(`Error in deleteSession: ${error}`, 'SessionManagerDB');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Validate session
  static async validateSession(sessionId: string): Promise<{ valid: boolean; error?: string; session?: Session }> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return { valid: false, error: '找不到會話' };
      }

      if (session.status !== 'active') {
        return { valid: false, error: `會話狀態為 ${session.status}` };
      }

      return { valid: true, session };
    } catch (error) {
      Logger.error(`Error in validateSession: ${error}`, 'SessionManagerDB');
      return { valid: false, error: '內部伺服器錯誤' };
    }
  }

  // Helper method to map database row to Session object
  private static mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      status: row.status as 'active' | 'ended' | 'archived',
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      settings: row.settings as SessionSettings,
      stats: row.stats as SessionStats
    };
  }

  // Generate unique session code
  private static generateSessionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Calculate average team score
  private static calculateAverageTeamScore(teams: Array<{ averageScore?: number }>): number | undefined {
    const validScores = teams
      .map(t => t.averageScore)
      .filter(score => score !== undefined && !isNaN(score)) as number[];
    
    return validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : undefined;
  }

  // Clear session memory (delete all related data)
  private static async clearSessionMemory(sessionId: string): Promise<void> {
    try {
      // Delete all applicants
      await supabase.from('applicants').delete().eq('session_id', sessionId);
      
      // Delete all assignment sessions
      await supabase.from('assignment_sessions').delete().eq('session_id', sessionId);
      
      // Reset teams (remove applicants but keep team structure)
      await supabase
        .from('teams')
        .update({ 
          is_complete: false 
        })
        .eq('session_id', sessionId);
    } catch (error) {
      Logger.error(`Error clearing session memory: ${error}`, 'SessionManagerDB');
    }
  }

  // Update session stats
  static async updateSessionStats(sessionId: string): Promise<void> {
    try {
      // Get current stats from database
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, is_complete, applicants(id)')
        .eq('session_id', sessionId);

      const { data: applicantsData } = await supabase
        .from('applicants')
        .select('id, team_id')
        .eq('session_id', sessionId);

      if (!teamsData || !applicantsData) return;

      const totalTeams = teamsData.length;
      const totalApplicants = applicantsData.length;
      const completedTeams = teamsData.filter(t => t.is_complete).length;
      const pendingApplicants = applicantsData.filter(a => !a.team_id).length;
      const averageTeamSize = totalTeams > 0 ? totalApplicants / totalTeams : 0;

      // Calculate assigned teams
      const { data: assignmentSessions, error: assignmentError } = await supabase
        .from('assignment_sessions')
        .select('team_id')
        .eq('session_id', sessionId);
      
      const assignedTeams = assignmentError ? 0 : (assignmentSessions?.length || 0);

      const stats: SessionStats = {
        totalTeams,
        completeTeams: completedTeams,
        totalApplicants,
        assignedTeams,
        averageTeamSize: totalTeams > 0 ? totalApplicants / totalTeams : 0,
        pendingApplicants: 0, // This would need to be calculated based on unassigned applicants
        lastActivity: new Date()
      };

      await supabase
        .from('sessions')
        .update({ stats })
        .eq('id', sessionId);
    } catch (error) {
      Logger.error(`Error updating session stats: ${error}`, 'SessionManagerDB');
    }
  }

  // Archive session (mark as archived but keep data)
  static async archiveSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: '找不到會話' };
      }

      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'archived',
          stats: {
            ...session.stats,
            lastActivity: new Date()
          }
        })
        .eq('id', sessionId);

      if (error) {
        Logger.error(`Error archiving session: ${error}`, 'SessionManagerDB');
        return { success: false, error: '歸檔會話失敗' };
      }

      return { success: true };
    } catch (error) {
      Logger.error(`Error in archiveSession: ${error}`, 'SessionManagerDB');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Cleanup old ended sessions (maintenance method)
  static async cleanupEndedSessions(maxAgeHours: number = 24): Promise<{ success: boolean; cleaned: number; errors: string[] }> {
    try {
      const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
      
      // Get old ended sessions
      const { data: oldSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, name, ended_at')
        .eq('status', 'ended')
        .lt('ended_at', cutoffTime.toISOString());

      if (fetchError) {
        Logger.error(`Error fetching old sessions: ${fetchError}`, 'SessionManagerDB');
        return { success: false, cleaned: 0, errors: ['獲取舊會話失敗'] };
      }

      if (!oldSessions || oldSessions.length === 0) {
        return { success: true, cleaned: 0, errors: [] };
      }

      let cleanedCount = 0;
      const errors: string[] = [];

      for (const session of oldSessions) {
        try {
          Logger.info(`Cleaning up old ended session ${session.id} (${session.name}, ended: ${session.ended_at})`, 'SessionManagerDB');
          const deleteResult = await this.deleteSession(session.id);
          
          if (deleteResult.success) {
            cleanedCount++;
          } else {
            errors.push(`刪除會話 ${session.id} 失敗: ${deleteResult.error}`);
          }
        } catch (error) {
          errors.push(`刪除會話 ${session.id} 異常: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      }

      return { success: true, cleaned: cleanedCount, errors };
    } catch (error) {
      Logger.error(`Error in cleanupEndedSessions: ${error}`, 'SessionManagerDB');
      return { success: false, cleaned: 0, errors: ['內部伺服器錯誤'] };
    }
  }

  // Create teams for session based on team configs
  static async createSessionTeams(sessionId: string): Promise<{ success: boolean; created?: number; error?: string }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: '找不到會話' };
      }

      // Check if teams already exist for this session
      const { data: existingTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('session_id', sessionId);

      if (existingTeams && existingTeams.length > 0) {
        return { success: false, error: '此會話已存在團隊' };
      }

      // Get team configs from session settings
      const teamConfigs = session.settings.teamConfigs || [];
      if (teamConfigs.length === 0) {
        return { success: false, error: '找不到會話的團隊配置' };
      }

      // Create teams
      const teamInserts = teamConfigs.map(config => ({
        session_id: sessionId,
        name: config.name,
        max_members: config.maxMembers,
        is_complete: false
      }));

      const { data: createdTeams, error } = await supabase
        .from('teams')
        .insert(teamInserts)
        .select('id, name, session_id, max_members, is_complete, created_at');

      if (error) {
        Logger.error(`Error creating teams: ${error}`, 'SessionManagerDB');
        return { success: false, error: '創建團隊失敗' };
      }

      // Update session stats
      await this.updateSessionStats(sessionId);

      return { success: true, created: createdTeams?.length || 0 };
    } catch (error) {
      Logger.error(`Error in createSessionTeams: ${error}`, 'SessionManagerDB');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }
}