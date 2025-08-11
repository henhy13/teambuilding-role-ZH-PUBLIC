const munkres = require('munkres-js');
import { ScoreMatrix, TeamAssignment, Assignment, Team, RoleDefinition } from '../../types';

export class Assigner {
  // Assign applicants to roles using Hungarian Algorithm
  static assignRoles(
    team: Team, 
    roles: RoleDefinition[], 
    scoreMatrix: ScoreMatrix
  ): { success: boolean; assignment?: TeamAssignment; error?: string } {
    try {
        if (!team.isComplete) {
    return { success: false, error: `團隊必須滿員 (${team.applicants.length}/${team.maxMembers} 成員) 才能進行角色分配` };
  }

      const teamSize = team.applicants.length;
      const rolesCount = roles.length;
      
      if (rolesCount < teamSize) {
        return { success: false, error: `必須至少有 ${teamSize} 個角色給 ${teamSize} 個團隊成員 (目前有 ${rolesCount} 個)` };
      }

      if (scoreMatrix.scores.length !== teamSize || !scoreMatrix.scores.every(row => row.length === rolesCount)) {
        return { success: false, error: `Score matrix must be ${teamSize}x${rolesCount} (${teamSize} applicants x ${rolesCount} roles)` };
      }

      // Convert scores to cost matrix (Hungarian algorithm minimizes cost)
      // We want to maximize scores, so we subtract from max possible score (100)
      const costMatrix = scoreMatrix.scores.map(row => 
        row.map(score => 100 - score)
      );

      // Run Hungarian algorithm
      const hungarianResult = munkres(costMatrix);

      if (!hungarianResult || hungarianResult.length !== teamSize) {
        return { success: false, error: '匈牙利演算法無法找到有效分配' };
      }

      // Build assignments
      const assignments: Assignment[] = [];
      let totalScore = 0;

      for (const [applicantIndex, roleIndex] of hungarianResult) {
        if (applicantIndex < 0 || applicantIndex >= teamSize || roleIndex < 0 || roleIndex >= rolesCount) {
          return { success: false, error: `Invalid assignment indices: [${applicantIndex}, ${roleIndex}] (expected: applicant 0-${teamSize-1}, role 0-${rolesCount-1})` };
        }

        const applicant = team.applicants[applicantIndex];
        const role = roles[roleIndex];
        const score = scoreMatrix.scores[applicantIndex][roleIndex];

        if (!applicant) {
          return { success: false, error: `在索引 ${applicantIndex} 找不到申請者` };
        }

        if (!role) {
          return { success: false, error: `在索引 ${roleIndex} 找不到角色` };
        }

        assignments.push({
          applicantId: applicant.id,
          roleId: role.id,
          score: score
        });

        totalScore += score;
      }

      // Verify we have exactly teamSize unique assignments
      const assignedApplicants = new Set(assignments.map(a => a.applicantId));
      const assignedRoles = new Set(assignments.map(a => a.roleId));

      if (assignedApplicants.size !== teamSize) {
        return { success: false, error: `Not all ${teamSize} applicants were assigned uniquely` };
      }

      if (assignedRoles.size !== teamSize) {
        return { success: false, error: `Not all ${teamSize} roles were assigned uniquely` };
      }

      const teamAssignment: TeamAssignment = {
        teamId: team.id,
        assignments,
        totalScore,
        generatedAt: new Date(),
        justificationsGenerated: false
      };

      return { success: true, assignment: teamAssignment };

    } catch (error) {
      return { 
        success: false, 
        error: `分配失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Get assignment details with applicant and role names
  static getAssignmentDetails(
    team: Team, 
    roles: RoleDefinition[], 
    assignment: TeamAssignment
  ): { success: boolean; details?: AssignmentDetail[]; error?: string } {
    try {
      if (!assignment || !assignment.assignments) {
        return { success: false, error: '分配數據不存在' };
      }

      const details: AssignmentDetail[] = [];

      for (const assign of assignment.assignments) {
        const applicant = team.applicants.find(a => a.id === assign.applicantId);
        const role = roles.find(r => r.id === assign.roleId);

        if (!applicant) {
          return { success: false, error: `找不到 ID 為 ${assign.applicantId} 的申請者` };
        }

        if (!role) {
          return { success: false, error: `找不到 ID 為 ${assign.roleId} 的角色` };
        }

        details.push({
          applicant: {
            id: applicant.id,
            name: applicant.name,
            occupation: applicant.occupation,
            skills: applicant.skills,
            personalityTraits: applicant.personalityTraits
          },
          role: {
            id: role.id,
            name: role.name,
            description: role.description
          },
          score: assign.score,
          justification: assign.justification
        });
      }

      return { success: true, details };

    } catch (error) {
      return { 
        success: false, 
        error: `獲取分配詳情失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Calculate assignment statistics
  static getAssignmentStats(assignment: TeamAssignment): AssignmentStats {
    const scores = assignment.assignments.map(a => a.score);
    
    return {
      totalScore: assignment.totalScore,
      averageScore: assignment.totalScore / assignment.assignments.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      scoreDistribution: this.calculateScoreDistribution(scores)
    };
  }

  // Calculate score distribution in ranges
  private static calculateScoreDistribution(scores: number[]): { range: string; count: number }[] {
    const ranges = [
      { range: '90-100', min: 90, max: 100 },
      { range: '80-89', min: 80, max: 89 },
      { range: '70-79', min: 70, max: 79 },
      { range: '60-69', min: 60, max: 69 },
      { range: '50-59', min: 50, max: 59 },
      { range: '0-49', min: 0, max: 49 }
    ];

    return ranges.map(range => ({
      range: range.range,
      count: scores.filter(score => score >= range.min && score <= range.max).length
    }));
  }

  // Validate assignment integrity
  static validateAssignment(
    team: Team, 
    roles: RoleDefinition[], 
    assignment: TeamAssignment
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check team ID matches
    if (assignment.teamId !== team.id) {
      errors.push('分配團隊ID與提供的團隊不符');
    }

    // Check assignment count
    const expectedAssignments = team.applicants.length;
    if (assignment.assignments.length !== expectedAssignments) {
      errors.push(`Expected ${expectedAssignments} assignments, got ${assignment.assignments.length}`);
    }

    // Check for duplicate applicant assignments
    const assignedApplicants = assignment.assignments.map(a => a.applicantId);
    const uniqueApplicants = new Set(assignedApplicants);
    if (uniqueApplicants.size !== assignedApplicants.length) {
      errors.push('發現重複的申請者分配');
    }

    // Check for duplicate role assignments
    const assignedRoles = assignment.assignments.map(a => a.roleId);
    const uniqueRoles = new Set(assignedRoles);
    if (uniqueRoles.size !== assignedRoles.length) {
      errors.push('發現重複的角色分配');
    }

    // Check all applicants are from the team
    for (const assign of assignment.assignments) {
      if (!team.applicants.find(a => a.id === assign.applicantId)) {
        errors.push(`在團隊中找不到申請者 ${assign.applicantId}`);
      }
    }

    // Check all roles are valid
    for (const assign of assignment.assignments) {
      if (!roles.find(r => r.id === assign.roleId)) {
        errors.push(`在角色列表中找不到角色 ${assign.roleId}`);
      }
    }

    // Check score validity
    for (const assign of assignment.assignments) {
      if (assign.score < 0 || assign.score > 100) {
        errors.push(`Invalid score ${assign.score} for assignment ${assign.applicantId} -> ${assign.roleId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Helper interfaces for assignment details
export interface AssignmentDetail {
  applicant: {
    id: string;
    name: string;
    occupation: string;
    skills: string[];
    personalityTraits: string[];
  };
  role: {
    id: string;
    name: string;
    description?: string;
  };
  score: number;
  justification?: string;
}

export interface AssignmentStats {
  totalScore: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  scoreDistribution: { range: string; count: number }[];
}