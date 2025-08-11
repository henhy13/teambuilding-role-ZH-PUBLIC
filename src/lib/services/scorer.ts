import { Team, ScoreMatrix, RoleDefinition } from '../../types';
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

export class Scorer {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'gpt-4o-mini';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second base delay

  // Generate scoring matrix for a single team
  static async generateScoreMatrix(
    team: Team, 
    roles: RoleDefinition[], 
    openaiApiKey: string
  ): Promise<{ success: boolean; scoreMatrix?: ScoreMatrix; error?: string }> {
    return this.generateScoreMatrixWithRetry(team, roles, openaiApiKey, 0);
  }

  // Batch generate scoring matrices for multiple teams using Promise.all
  static async generateScoreMatricesBatch(
    teams: Team[],
    rolesArray: RoleDefinition[][],
    openaiApiKey: string,
    options: {
      maxConcurrency?: number;
      retryFailedRequests?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    results: Array<{
      teamId: string;
      success: boolean;
      scoreMatrix?: ScoreMatrix;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const { maxConcurrency = 10, retryFailedRequests = true } = options;

    if (teams.length !== rolesArray.length) {
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0 }
      };
    }

    // Create batches to respect concurrency limits
    const batches = this.createBatches(teams, maxConcurrency);
    const rolesBatches = this.createBatches(rolesArray, maxConcurrency);
    
    const allResults: Array<{
      teamId: string;
      success: boolean;
      scoreMatrix?: ScoreMatrix;
      error?: string;
    }> = [];

    // Process batches sequentially, but items within each batch in parallel
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const rolesBatch = rolesBatches[i];

      Logger.info(`Processing scoring batch ${i + 1}/${batches.length} with ${batch.length} teams`, 'Scorer');

      // Use Promise.allSettled to handle failures gracefully
      const batchPromises = batch.map((team, index) => 
        this.generateScoreMatrixWithRetry(team, rolesBatch[index], openaiApiKey, 0)
          .then(result => ({
            teamId: team.id,
            ...result
          }))
          .catch(error => ({
            teamId: team.id,
            success: false,
            error: `批次處理錯誤：${error.message}`
          }))
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
        } else {
          allResults.push({
            teamId: 'unknown',
            success: false,
            error: `Promise failed: ${result.reason}`
          });
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await this.delay(500);
      }
    }

    // Retry failed requests if enabled
    if (retryFailedRequests) {
      const failedResults = allResults.filter(r => !r.success);
      if (failedResults.length > 0) {
        Logger.info(`Retrying ${failedResults.length} failed scoring requests...`, 'Scorer');
        
        const retryPromises = failedResults.map(async (failedResult) => {
          const team = teams.find(t => t.id === failedResult.teamId);
          const rolesIndex = teams.findIndex(t => t.id === failedResult.teamId);
          
          if (team && rolesIndex >= 0) {
            await this.delay(Math.random() * 2000); // Random delay to spread load
            return this.generateScoreMatrixWithRetry(team, rolesArray[rolesIndex], openaiApiKey, 0)
              .then(result => ({ teamId: team.id, ...result }))
              .catch(error => ({
                teamId: team.id,
                success: false,
                error: `Retry failed: ${error.message}`
              }));
          }
          return failedResult;
        });

        const retryResults = await Promise.allSettled(retryPromises);
        
        // Update results with retry outcomes
        retryResults.forEach((retryResult, index) => {
          if (retryResult.status === 'fulfilled') {
            const originalIndex = allResults.findIndex(r => r.teamId === failedResults[index].teamId);
            if (originalIndex >= 0) {
              allResults[originalIndex] = retryResult.value;
            }
          }
        });
      }
    }

    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.length - successful;

    return {
      success: successful > 0,
      results: allResults,
      summary: {
        total: allResults.length,
        successful,
        failed
      }
    };
  }

  // Generate score matrix with retry logic
  private static async generateScoreMatrixWithRetry(
    team: Team, 
    roles: RoleDefinition[], 
    openaiApiKey: string,
    retryCount: number
  ): Promise<{ success: boolean; scoreMatrix?: ScoreMatrix; error?: string }> {
    try {
          if (!team.isComplete) {
      return { success: false, error: `團隊必須滿員 (${team.applicants.length}/${team.maxMembers} 成員) 才能進行評分` };
    }

      const teamSize = team.applicants.length;
      const rolesCount = roles.length;
      if (rolesCount < teamSize) {
        return { success: false, error: `必須至少有 ${teamSize} 個角色給 ${teamSize} 個團隊成員 (目前有 ${rolesCount} 個)` };
      }

      const prompt = this.buildScoringPrompt(team, roles);
      
      // Ensure all roles have descriptions before prompting
      const rolesWithDescriptions: RoleDefinition[] = roles.map((r) => ({
        ...r,
        description: (r.description && r.description.trim().length > 0)
          ? r.description
          : '（描述缺失，請依角色名稱與常識判斷）'
      }));

      const request: OpenAIRequest = {
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的團隊組成分析師。你將分析申請者資料，評估每個人與不同團隊角色的匹配度。請只輸出有效的 JSON。'
          },
          {
            role: 'user',
            content: this.buildScoringPrompt(team, rolesWithDescriptions)
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
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
      let parsedScores: number[][];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('回應中找不到JSON陣列');
        }
        parsedScores = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error(`解析LLM回應失敗：${parseError}`);
      }

      // Validate the matrix dimensions and values
      if (!Array.isArray(parsedScores) || parsedScores.length !== teamSize) {
        throw new Error(`Score matrix must be ${teamSize}x${rolesCount} (${teamSize} applicants x ${rolesCount} roles)`);
      }

      for (let i = 0; i < teamSize; i++) {
        if (!Array.isArray(parsedScores[i]) || parsedScores[i].length !== rolesCount) {
          throw new Error(`Row ${i} must have exactly ${rolesCount} scores (one for each role)`);
        }
        for (let j = 0; j < rolesCount; j++) {
          const score = parsedScores[i][j];
          if (typeof score !== 'number' || score < 0 || score > 100) {
            throw new Error(`Invalid score at [${i}][${j}]: must be number between 0-100`);
          }
        }
      }

      const scoreMatrix: ScoreMatrix = {
        teamId: team.id,
        scores: parsedScores,
        generatedAt: new Date()
      };

      return { success: true, scoreMatrix };

    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable && retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        Logger.debug(`Retrying scoring for team ${team.id} (attempt ${retryCount + 1}/${this.MAX_RETRIES}) after ${delay}ms...`, 'Scorer');
        
        await this.delay(delay);
        return this.generateScoreMatrixWithRetry(team, roles, openaiApiKey, retryCount + 1);
      }

      return { 
        success: false, 
        error: `評分在 ${retryCount} 次重試後失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }

  // Build the prompt for LLM scoring (Chinese, with guaranteed role descriptions)
  private static buildScoringPrompt(team: Team, roles: RoleDefinition[]): string {
    const applicantsText = team.applicants.map((applicant, index) => 
      `申請者 ${index + 1}: ${applicant.name}
職業: ${applicant.occupation}
年資: ${applicant.yearsOfExperience} ${applicant.experienceUnit === 'months' ? '個月' : '年'}
技能: ${applicant.skills.join('、')}
個性特質: ${applicant.personalityTraits.join('、')}`
    ).join('\n\n');

    const rolesText = roles.map((role, index) => {
      const desc = role.description && role.description.trim().length > 0 ? role.description.trim() : '（描述缺失，請依角色名稱與常識判斷）';
      return `${role.name}（位置 ${index + 1}）\n角色描述：${desc}`;
    }).join('\n\n');

    const teamSize = team.applicants.length;
    const rolesCount = roles.length;
    
    return `你是一位專業的團隊組成分析師。請根據每位申請者的背景與各角色的要求，評估其適配度並給出分數。

需要分析的申請者：
${applicantsText}

可用角色與需求：
${rolesText}

關鍵指示：
1. 必須同時考量每位申請者的職業、年資、技能與個性特質
2. 必須依據每個角色的具體描述與需求來比對
3. 請以 0–100 分為尺度，為每位申請者（1-${teamSize}）對每個角色（1-${rolesCount}）評分
4. 明顯高度匹配給高分（90–100）
5. 明顯不匹配給低分（0–30）
6. 合理判斷：例如 啦啦隊 應該更看重帶動士氣，推車經理 應該更看重體能與配合度
7. 年資越多且與角色越相關，分數可適度提高

評估流程：
對每位申請者逐一思考：「其職業／經驗／技能／個性是否符合該角色需求？」
- 若符合：80–100
- 若部分符合：40–79
- 若不符合：0–39

輸出格式（只允許純 JSON）：
請只輸出一個 ${teamSize}x${rolesCount} 的 JSON 陣列（不得包含任何其他文字）：
- 第 1 列 = 申請者 1 對所有 ${rolesCount} 個角色的分數
- 第 2 列 = 申請者 2 對所有 ${rolesCount} 個角色的分數
${teamSize > 2 ? '- 第 3 列起 = 其他申請者...' : ''}
- 每個分數必須介於 0–100

請勿照抄任何樣例模式，務必根據每位申請者的真實資料進行分析。

只輸出 JSON 陣列：`;
  }

  // Utility methods for batch processing
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static isRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = (error as any)?.message?.toLowerCase() || '';
    const isNetworkError = errorMessage.includes('network') || 
                          errorMessage.includes('timeout') || 
                          errorMessage.includes('fetch');
    
    const isRateLimited = errorMessage.includes('rate limit') || 
                         errorMessage.includes('429') ||
                         errorMessage.includes('too many requests');
    
    const isServerError = errorMessage.includes('500') || 
                         errorMessage.includes('502') || 
                         errorMessage.includes('503') || 
                         errorMessage.includes('504');

    return isNetworkError || isRateLimited || isServerError;
  }

  // Validate score matrix format
  static validateScoreMatrix(scores: unknown, expectedRows: number, expectedCols: number): scores is number[][] {
    if (!Array.isArray(scores) || scores.length !== expectedRows) {
      return false;
    }

    return scores.every(row => 
      Array.isArray(row) && 
      row.length === expectedCols && 
      row.every(score => 
        typeof score === 'number' && 
        score >= 0 && 
        score <= 100
      )
    );
  }

  // Performance monitoring
  static async generateScoreMatrixWithMetrics(
    team: Team, 
    roles: RoleDefinition[], 
    openaiApiKey: string
  ): Promise<{
    success: boolean;
    scoreMatrix?: ScoreMatrix;
    error?: string;
    metrics: {
      startTime: number;
      endTime: number;
      duration: number;
      retryCount: number;
    };
  }> {
    const startTime = Date.now();
    let maxRetryCount = 0;

    // Custom retry function that tracks attempts
    const generateWithTracking = async (
      teamParam: Team, 
      rolesParam: RoleDefinition[], 
      apiKey: string, 
      currentRetry: number
    ): Promise<{ success: boolean; scoreMatrix?: ScoreMatrix; error?: string }> => {
      maxRetryCount = Math.max(maxRetryCount, currentRetry);
      return this.generateScoreMatrixWithRetry(teamParam, rolesParam, apiKey, currentRetry);
    };

    const result = await generateWithTracking(team, roles, openaiApiKey, 0);
    const endTime = Date.now();

    return {
      ...result,
      metrics: {
        startTime,
        endTime,
        duration: endTime - startTime,
        retryCount: maxRetryCount
      }
    };
  }
}