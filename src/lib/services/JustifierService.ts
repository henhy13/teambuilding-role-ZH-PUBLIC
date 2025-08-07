import { Team, RoleDefinition, TeamAssignment, Assignment } from '../../types';
import Logger from '../utils/logger';

// OpenAI API types
interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface JustificationResponse {
  applicantId: string;
  justification: string;
}

export class JustifierService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'gpt-4o-mini';

  // Generate AI justifications for all assignments
  static async generateJustifications(
    team: Team,
    roles: RoleDefinition[],
    assignment: TeamAssignment,
    openaiApiKey: string
  ): Promise<{ success: boolean; updatedAssignment?: TeamAssignment; error?: string }> {
    try {
      const teamSize = assignment.assignments.length;
      if (teamSize !== team.applicants.length) {
        throw new Error(`Assignment must have exactly ${team.applicants.length} assignments (got ${teamSize})`);
      }

      const prompt = this.buildJustificationPrompt(team, roles, assignment);

      const request: OpenAIRequest = {
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的團隊組建分析師。你將根據申請者的個人資料和團隊動態，為角色分配提供簡潔而深入的理由說明。請始終只回應有效的JSON格式。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 3000
      };

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('LLM無回應內容');
      }

      // Parse the JSON response
      let parsedJustifications: JustificationResponse[];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('回應中找不到JSON陣列');
        }
        parsedJustifications = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error(`解析LLM回應失敗：${parseError}`);
      }

      Logger.debug(`OpenAI response for team ${team.id}: ${JSON.stringify(parsedJustifications, null, 2)}`, 'JustifierService');
      Logger.debug(`Expected applicant IDs: ${assignment.assignments.map(a => a.applicantId).join(', ')}`, 'JustifierService');

      // Validate the response format
      const expectedCount = assignment.assignments.length;
      if (!Array.isArray(parsedJustifications) || parsedJustifications.length !== expectedCount) {
        throw new Error(`Must have exactly ${expectedCount} justifications (got ${parsedJustifications?.length || 0})`);
      }

      // Create a map for quick lookup by applicant ID and name
      const justificationMap = new Map<string, string>();
      const nameToIdMap = new Map<string, string>();
      
      // Build name to ID mapping
      for (const assign of assignment.assignments) {
        const applicant = team.applicants.find(a => a.id === assign.applicantId);
        if (applicant) {
          nameToIdMap.set(applicant.name, assign.applicantId);
        }
      }
      
      for (const justification of parsedJustifications) {
        if (!justification.applicantId || !justification.justification) {
          throw new Error('無效的理由格式：缺少申請者ID或理由');
        }
        
        if (typeof justification.justification !== 'string' || justification.justification.length > 500) {
          throw new Error('理由必須是少於500字元的字串');
        }

        // Try to match by UUID first, then by name
        let actualApplicantId = justification.applicantId;
        if (!assignment.assignments.find(a => a.applicantId === justification.applicantId)) {
          // If not found by UUID, try to find by name
          const idFromName = nameToIdMap.get(justification.applicantId);
          if (idFromName) {
            actualApplicantId = idFromName;
            Logger.debug(`Mapped name "${justification.applicantId}" to UUID ${actualApplicantId}`, 'JustifierService');
          }
        }

        justificationMap.set(actualApplicantId, justification.justification.trim());
      }

      // Update assignments with justifications
      const updatedAssignments: Assignment[] = assignment.assignments.map(assign => {
        const justification = justificationMap.get(assign.applicantId);
        if (!justification) {
          throw new Error(`No justification found for applicant ${assign.applicantId}`);
        }

        return {
          ...assign,
          justification
        };
      });

      const updatedAssignment: TeamAssignment = {
        ...assignment,
        assignments: updatedAssignments,
        justificationsGenerated: true
      };

      return { success: true, updatedAssignment };

    } catch (error) {
      return { 
        success: false, 
        error: `理由生成失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Generate a single justification
  static async generateSingleJustification(
    applicant: { id: string; name: string; occupation: string; yearsOfExperience: number; skills: string[]; personalityTraits: string[] },
    role: { id: string; name: string; description?: string },
    score: number,
    openaiApiKey: string
  ): Promise<{ success: boolean; justification?: string; error?: string }> {
    try {
      const prompt = `請為這個人適合此角色提供簡短的理由說明（1-2句話）。

人員資料：${applicant.name}
職業：${applicant.occupation}
工作經驗：${applicant.yearsOfExperience}年
技能：${applicant.skills.join('、')}
性格特質：${applicant.personalityTraits.join('、')}

分配角色：${role.name}
匹配分數：${score}/100

請根據其個人資料和經驗解釋為何此分配合理。請保持在200字元以內，並保持正面和建設性的語調。

只需回應理由說明文字，不要JSON或其他格式。`;

      const request: OpenAIRequest = {
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的團隊組建分析師。請為角色分配提供簡潔而深入的理由說明。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 200
      };

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();
      const justification = data.choices[0]?.message?.content?.trim();

      if (!justification) {
        throw new Error('LLM無理由內容');
      }

      if (justification.length > 500) {
        throw new Error('理由過長（最多500字元）');
      }

      return { success: true, justification };

    } catch (error) {
      return { 
        success: false, 
        error: `單一理由生成失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Build the prompt for LLM justification
  private static buildJustificationPrompt(
    team: Team, 
    roles: RoleDefinition[], 
    assignment: TeamAssignment
  ): string {
    // Build assignment details for context
    const assignmentDetails = assignment.assignments.map(assign => {
      const applicant = team.applicants.find(a => a.id === assign.applicantId);
      const role = roles.find(r => r.id === assign.roleId);
      
      if (!applicant || !role) {
        throw new Error('無效的分配：找不到申請者或角色');
      }

      return {
        applicantId: applicant.id,
        applicantName: applicant.name,
        occupation: applicant.occupation,
        yearsOfExperience: applicant.yearsOfExperience,
        skills: applicant.skills,
        personalityTraits: applicant.personalityTraits,
        roleName: role.name,
        score: assign.score
      };
    });

    // Sort by score for better context
    assignmentDetails.sort((a, b) => b.score - a.score);

    const assignmentsText = assignmentDetails.map(detail => 
      `${detail.applicantName} → ${detail.roleName} (Score: ${detail.score})
      Profile: ${detail.occupation} (${detail.yearsOfExperience} years) | Skills: ${detail.skills.join(', ')} | Traits: ${detail.personalityTraits.join(', ')}`
    ).join('\n\n');

    return `請為以下角色分配提供簡短的理由說明（每條1-2句）。請重點說明每個人基於其技能、職業、工作經驗年數和性格特質，為何適合其分配的角色。

分配結果：
${assignmentsText}

指示：
1. 用1-2句話解釋每個分配的合理性
2. 重點關注個人資料與其角色之間的具體匹配
3. 考慮其工作經驗年數與角色要求的關係
4. 考慮互補技能和團隊動態的相關性
5. 每個理由說明保持在200字元以內
6. 保持正面和建設性的語調

請只回應包含'applicantId'和'justification'欄位的JSON陣列：

範例格式：
[
  {
    "applicantId": "uuid-here",
    "justification": "其強大的分析技能和財務背景使其非常適合處理數據驅動的決策和戰略規劃。"
  },
  {
    "applicantId": "uuid-here", 
    "justification": "天生的領導特質結合優秀的溝通技巧，完美契合協調團隊工作的需求。"
  },
  ...
]

你的回應應該只包含JSON陣列，不要有其他文字。`;
  }

  // Validate justifications format
  static validateJustifications(justifications: unknown): justifications is JustificationResponse[] {
    if (!Array.isArray(justifications)) {
      return false;
    }

    return justifications.every(item => 
      item && 
      typeof item === 'object' &&
      'applicantId' in item &&
      'justification' in item &&
      typeof item.applicantId === 'string' &&
      typeof item.justification === 'string' &&
      item.justification.length <= 500
    );
  }

  // Update specific assignment justification
  static updateAssignmentJustification(
    assignment: TeamAssignment,
    applicantId: string,
    justification: string
  ): { success: boolean; updatedAssignment?: TeamAssignment; error?: string } {
    if (justification.length > 500) {
      return { success: false, error: '說明文字過長（最多500個字元）' };
    }

    const assignmentIndex = assignment.assignments.findIndex(a => a.applicantId === applicantId);
    if (assignmentIndex === -1) {
      return { success: false, error: '在分配中找不到申請者' };
    }

    const updatedAssignments = [...assignment.assignments];
    updatedAssignments[assignmentIndex] = {
      ...updatedAssignments[assignmentIndex],
      justification
    };

    const updatedAssignment: TeamAssignment = {
      ...assignment,
      assignments: updatedAssignments
    };

    return { success: true, updatedAssignment };
  }
}