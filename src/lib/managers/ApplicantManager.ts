import { Applicant } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { Database } from '../supabase';
import { TeamManager } from './TeamManager';
import Logger from '../utils/logger';

type ApplicantRow = Database['public']['Tables']['applicants']['Row'];
type ApplicantInsert = Database['public']['Tables']['applicants']['Insert'];

export class ApplicantManager {
  // Create a new applicant
  static async createApplicant(
    sessionId: string,
    applicantData: Omit<Applicant, 'id' | 'submittedAt'>
  ): Promise<{ success: boolean; applicant?: Applicant; error?: string }> {
    try {
      const applicantInsert: ApplicantInsert = {
        id: uuidv4(),
        name: applicantData.name,
        occupation: applicantData.occupation,
        years_of_experience: applicantData.yearsOfExperience,
        experience_unit: applicantData.experienceUnit,
        skills: applicantData.skills,
        personality_traits: applicantData.personalityTraits,
        team_id: null
      };

      const { data, error } = await supabase
        .from('applicants')
        .insert(applicantInsert)
        .select('id, name, occupation, years_of_experience, experience_unit, skills, personality_traits, team_id, submitted_at')
        .single();

      if (error) {
        Logger.error(`Error creating applicant: ${error}`, 'ApplicantManager');
        return { success: false, error: '創建申請者失敗' };
      }

      return { success: true, applicant: this.mapRowToApplicant(data) };
    } catch (error) {
      Logger.error(`Error in createApplicant: ${error}`, 'ApplicantManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Create a new applicant directly with team assignment (RACE CONDITION SAFE)
  static async createApplicantWithTeam(
    sessionId: string,
    teamId: string,
    applicantData: Omit<Applicant, 'id' | 'submittedAt'>
  ): Promise<{ success: boolean; applicant?: Applicant; error?: string }> {
    try {
      // Verify team exists and belongs to session
      const team = await TeamManager.getTeam(teamId);
      if (!team) {
        return { success: false, error: '找不到團隊' };
      }

      if (team.sessionId !== sessionId) {
        return { success: false, error: '團隊不屬於此會話' };
      }

      // Use enhanced atomic database function to prevent race conditions
      const applicantId = uuidv4();
      
      const { data, error } = await supabase
        .rpc('add_applicant_to_team', {
          p_applicant_id: applicantId,
          p_team_id: teamId,
          p_name: applicantData.name,
          p_occupation: applicantData.occupation,
          p_years_of_experience: applicantData.yearsOfExperience,
          p_experience_unit: applicantData.experienceUnit || 'years',
          p_skills: applicantData.skills,
          p_personality_traits: applicantData.personalityTraits
        });

      if (error) {
        Logger.error(`Error in atomic applicant creation: ${error}`, 'ApplicantManager');
        return { success: false, error: '創建申請者失敗' };
      }

      // Parse the JSON response from the database function
      const result = data as any;
      
      if (!result.success) {
        Logger.warn(`Team limit exceeded for team ${teamId}: ${result.error}`, 'ApplicantManager');
        return { success: false, error: result.error || '團隊已滿' };
      }

      // Update team stats (this will trigger completion check if needed)
      await TeamManager.updateTeamStats(teamId);

      // Convert database result to our Applicant type
      const applicant: Applicant = {
        id: result.applicant.id,
        name: result.applicant.name,
        occupation: result.applicant.occupation,
        yearsOfExperience: result.applicant.years_of_experience,
        experienceUnit: result.applicant.experience_unit,
        skills: result.applicant.skills,
        personalityTraits: result.applicant.personality_traits,
        submittedAt: new Date(result.applicant.submitted_at)
      };

      Logger.info(`Successfully added applicant ${applicant.name} to team ${teamId} (${result.team_status.current_count}/${result.team_status.max_count})`, 'ApplicantManager');

      return { success: true, applicant };
    } catch (error) {
      Logger.error(`Error in createApplicantWithTeam: ${error}`, 'ApplicantManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Add applicant to team
  static async addApplicantToTeam(
    teamId: string,
    applicantId: string,
    role?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get team info first
      const team = await TeamManager.getTeam(teamId);
      if (!team) {
        return { success: false, error: '找不到團隊' };
      }

      if (team.applicants.length >= team.maxMembers) {
        return { success: false, error: '團隊已滿' };
      }

      // Update applicant with team assignment
      const { error: applicantError } = await supabase
        .from('applicants')
        .update({ 
          team_id: teamId,
          assigned_role: role || null
        })
        .eq('id', applicantId);

      if (applicantError) {
        Logger.error(`Error assigning applicant to team: ${applicantError}`, 'ApplicantManager');
        return { success: false, error: '分配申請者到團隊失敗' };
      }

      // Update team member count and completion status
      await TeamManager.updateTeamStats(teamId);

      return { success: true };
    } catch (error) {
      Logger.error(`Error in addApplicantToTeam: ${error}`, 'ApplicantManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Remove applicant from team
  static async removeApplicantFromTeam(
    applicantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get applicant info first to know which team to update
      const { data: applicantData, error: fetchError } = await supabase
        .from('applicants')
        .select('team_id')
        .eq('id', applicantId)
        .single();

      if (fetchError) {
        Logger.error(`Error fetching applicant: ${fetchError}`, 'ApplicantManager');
        return { success: false, error: '找不到申請者' };
      }

      const teamId = applicantData.team_id;

      // Remove applicant from team
      const { error: updateError } = await supabase
        .from('applicants')
        .update({ 
          team_id: null,
          assigned_role: null
        })
        .eq('id', applicantId);

      if (updateError) {
        Logger.error(`Error removing applicant from team: ${updateError}`, 'ApplicantManager');
        return { success: false, error: '從團隊移除申請者失敗' };
      }

      // Update team stats if applicant was in a team
      if (teamId) {
        await TeamManager.updateTeamStats(teamId);
      }

      return { success: true };
    } catch (error) {
      Logger.error(`Error in removeApplicantFromTeam: ${error}`, 'ApplicantManager');
      return { success: false, error: '內部伺服器錯誤' };
    }
  }

  // Get unassigned applicants for a session
  static async getUnassignedApplicants(sessionId: string): Promise<Applicant[]> {
    try {
      const { data, error } = await supabase
        .from('applicants')
        .select('id, name, occupation, years_of_experience, experience_unit, skills, personality_traits, team_id, submitted_at')
        .eq('session_id', sessionId)
        .is('team_id', null)
        .order('submitted_at');

      if (error) {
        Logger.error(`Error fetching unassigned applicants: ${error}`, 'ApplicantManager');
        return [];
      }

      return data.map(row => this.mapRowToApplicant(row));
    } catch (error) {
      Logger.error(`Error in getUnassignedApplicants: ${error}`, 'ApplicantManager');
      return [];
    }
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