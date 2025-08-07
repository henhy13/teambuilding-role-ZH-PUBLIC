import { Team, Applicant } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { Database } from '../supabase';
import Logger from '../utils/logger';

type TeamRow = Database['public']['Tables']['teams']['Row'];
type TeamInsert = Database['public']['Tables']['teams']['Insert'];
type ApplicantRow = Database['public']['Tables']['applicants']['Row'];

export class TeamManager {
  // Get teams for a specific session or all teams
  static async getTeams(sessionId?: string): Promise<Team[]> {
    try {
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          session_id,
          max_members,
          is_complete,
          created_at,
          applicants (
            id,
            name,
            occupation,
            years_of_experience,
            experience_unit,
            skills,
            personality_traits,
            team_id,
            submitted_at
          )
        `);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        Logger.error(`Error fetching teams: ${error}`, 'TeamManager');
        return [];
      }

      return data.map(row => this.mapRowToTeam(row));
    } catch (error) {
      Logger.error(`Error in getTeams: ${error}`, 'TeamManager');
      return [];
    }
  }

  // Get all teams across all sessions (convenience method)
  static async getAllTeams(): Promise<Team[]> {
    return this.getTeams();
  }

  // Get a specific team
  static async getTeam(teamId: string): Promise<Team | null> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          session_id,
          max_members,
          is_complete,
          created_at,
          applicants (
            id,
            name,
            occupation,
            years_of_experience,
            experience_unit,
            skills,
            personality_traits,
            team_id,
            submitted_at
          )
        `)
        .eq('id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        Logger.error(`Error fetching team: ${error}`, 'TeamManager');
        return null;
      }

      return this.mapRowToTeam(data);
    } catch (error) {
      Logger.error(`Error in getTeam: ${error}`, 'TeamManager');
      return null;
    }
  }

  // Create a new team
  static async createTeam(
    sessionId: string,
    name: string,
    maxMembers: number = 6
  ): Promise<{ success: boolean; team?: Team; error?: string }> {
    try {
      const teamData: TeamInsert = {
        id: uuidv4(),
        session_id: sessionId,
        name,
        max_members: maxMembers,
        is_complete: false
      };

      const { data, error } = await supabase
        .from('teams')
        .insert(teamData)
        .select(`
          id,
          name,
          session_id,
          max_members,
          is_complete,
          created_at,
          applicants (
            id,
            name,
            occupation,
            years_of_experience,
            experience_unit,
            skills,
            personality_traits,
            team_id,
            submitted_at
          )
        `)
        .single();

      if (error) {
        Logger.error(`Error creating team: ${error}`, 'TeamManager');
        return { success: false, error: '創建團隊失敗' };
      }

      return { success: true, team: this.mapRowToTeam(data) };
    } catch (error) {
      Logger.error(`Error in createTeam: ${error}`, 'TeamManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Reset team (remove all members)
  static async resetTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove all applicants from this team
      const { error } = await supabase
        .from('applicants')
        .update({ 
          team_id: null,
          assigned_role: null
        })
        .eq('team_id', teamId);

      if (error) {
        Logger.error(`Error resetting team: ${error}`, 'TeamManager');
        return { success: false, error: '重置團隊失敗' };
      }

      // Update team stats
      await this.updateTeamStats(teamId);

      return { success: true };
    } catch (error) {
      Logger.error(`Error in resetTeam: ${error}`, 'TeamManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Delete team
  static async deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First remove all applicants from the team
      await supabase
        .from('applicants')
        .update({ 
          team_id: null,
          assigned_role: null
        })
        .eq('team_id', teamId);

      // Delete the team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) {
        Logger.error(`Error deleting team: ${error}`, 'TeamManager');
        return { success: false, error: '刪除團隊失敗' };
      }

      return { success: true };
    } catch (error) {
      Logger.error(`Error in deleteTeam: ${error}`, 'TeamManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Helper method to update team statistics
  static async updateTeamStats(teamId: string): Promise<void> {
    try {
      Logger.debug(`Called for team ${teamId}`, 'TeamManager.updateTeamStats');
      
      const { data: applicants, error } = await supabase
        .from('applicants')
        .select('id')
        .eq('team_id', teamId);

      if (error) {
        Logger.error(`Error fetching team applicants for stats: ${error}`, 'TeamManager');
        return;
      }

      const currentMembers = applicants.length;
      Logger.debug(`Team ${teamId} has ${currentMembers} members`, 'TeamManager.updateTeamStats');
      
      // Get team max members and current completion status
      const { data: teamData } = await supabase
        .from('teams')
        .select('max_members, is_complete, name')
        .eq('id', teamId)
        .single();

      if (!teamData) {
        Logger.error(`Team not found when updating stats: ${teamId}`, 'TeamManager');
        return;
      }

      const isComplete = currentMembers >= teamData.max_members;
      const wasComplete = teamData.is_complete;
      
      Logger.debug(`Team ${teamData.name} (${teamId}): currentMembers=${currentMembers}, maxMembers=${teamData.max_members}, isComplete=${isComplete}, wasComplete=${wasComplete}`, 'TeamManager.updateTeamStats');

      // Update team completion status
      await supabase
        .from('teams')
        .update({ 
          is_complete: isComplete
        })
        .eq('id', teamId);

      // If team just became complete, add to assignment queue
      if (isComplete && !wasComplete) {
        Logger.info(`Team ${teamData.name} (${teamId}) just became complete! Adding to assignment queue...`, 'TeamManager');
        
        // Import AssignmentSessionManager and AssignmentQueue dynamically to avoid circular dependencies
        const { AssignmentSessionManager } = await import('./AssignmentSessionManager');
        const { AssignmentQueue } = await import('../services/AssignmentQueue');
        
        // Check if assignment session already exists
        const existingSession = await AssignmentSessionManager.getAssignmentForTeam(teamId);
        Logger.debug(`Existing assignment session for team ${teamId}: ${existingSession ? `${existingSession.id} (${existingSession.status})` : 'none'}`, 'TeamManager.updateTeamStats');
        if (!existingSession) {
          const result = await AssignmentSessionManager.createAssignmentSession(teamId);
          if (result.success) {
            Logger.info(`Assignment session created for team ${teamId}: ${result.session?.id}`, 'TeamManager');
            // Add to assignment queue instead of direct processing
            await AssignmentQueue.getInstance().addTeam(teamId);
          } else {
            Logger.error(`Failed to create assignment session for team ${teamId}: ${result.error}`, 'TeamManager');
          }
        } else {
          Logger.debug(`Assignment session already exists for team ${teamId}: ${existingSession.id}`, 'TeamManager.updateTeamStats');
          // Check if assignment is still pending and add to queue if needed
          if (existingSession.status === 'pending') {
            Logger.info(`Assignment session is pending, adding team ${teamId} to queue`, 'TeamManager');
            await AssignmentQueue.getInstance().addTeam(teamId);
          }
        }
      } else if (isComplete) {
        // Team is complete but we might have missed the transition - check if it needs queue processing
        const { AssignmentSessionManager } = await import('./AssignmentSessionManager');
        const { AssignmentQueue } = await import('../services/AssignmentQueue');
        
        const existingSession = await AssignmentSessionManager.getAssignmentForTeam(teamId);
        if (!existingSession) {
          Logger.info(`Complete team ${teamData.name} (${teamId}) has no assignment session - creating one and adding to queue`, 'TeamManager');
          const result = await AssignmentSessionManager.createAssignmentSession(teamId);
          if (result.success) {
            Logger.info(`Assignment session created for complete team ${teamId}: ${result.session?.id}`, 'TeamManager');
            await AssignmentQueue.getInstance().addTeam(teamId);
          }
        } else if (existingSession.status === 'pending') {
          Logger.info(`Complete team ${teamData.name} (${teamId}) has pending assignment - adding to queue`, 'TeamManager');
          await AssignmentQueue.getInstance().addTeam(teamId);
        }
      }
    } catch (error) {
      Logger.error(`Error updating team stats: ${error}`, 'TeamManager');
    }
  }

  // Helper method to map database row to Team object
  private static mapRowToTeam(row: Database['public']['Tables']['teams']['Row'] & { applicants?: ApplicantRow[] }): Team {
    return {
      id: row.id,
      sessionId: row.session_id,
      name: row.name,
      applicants: row.applicants ? row.applicants.map((a) => this.mapRowToApplicant(a)) : [],
      maxMembers: row.max_members,
      isComplete: row.is_complete,
      createdAt: new Date(row.created_at)
    };
  }

  // Helper method to map database row to Applicant object
  private static mapRowToApplicant(row: ApplicantRow): Applicant {
    return {
      id: row.id,
      name: row.name,
      occupation: row.occupation,
      yearsOfExperience: row.years_of_experience,
      experienceUnit: row.experience_unit as 'years' | 'months',
      skills: row.skills || [],
      personalityTraits: row.personality_traits || [],
      submittedAt: new Date(row.submitted_at)
    };
  }
}