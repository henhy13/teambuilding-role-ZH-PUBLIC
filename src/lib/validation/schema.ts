import { z } from 'zod';
import { createTranslationFunction, getStoredLanguage, TranslationFunction } from '../translations';

// Get current translation function
const getCurrentTranslation = () => {
  const currentLang = getStoredLanguage();
  return createTranslationFunction(currentLang);
};

const t = getCurrentTranslation();

export const ApplicantSchema = z.object({
  name: z.string().min(1, t('validation.name.required')).max(50, t('validation.name.maxLength')),
  occupation: z.string().min(1, t('validation.occupation.required')).max(100, t('validation.occupation.maxLength')),
  yearsOfExperience: z.number().min(0, t('validation.experience.negative')).max(70, t('validation.experience.maxValue')),
  experienceUnit: z.enum(['years', 'months']).optional(),
  skills: z.array(z.string().min(1).max(30, t('validation.skills.maxLength'))).min(1, t('validation.skills.minCount')).max(5, t('validation.skills.maxCount')),
  personalityTraits: z.array(z.string().min(1).max(40, t('validation.traits.maxLength'))).min(1, t('validation.traits.minCount')).max(5, t('validation.traits.maxCount')),
});

export const TeamSchema = z.object({
  name: z.string().min(1, t('validation.teamName.required')).max(100, t('validation.teamName.tooLong')),
  sessionId: z.string().uuid(t('validation.sessionId.invalid')),
});

export const SubmitApplicantSchema = z.object({
  sessionId: z.string().uuid(t('validation.sessionId.invalid')),
  teamId: z.string().uuid(t('validation.teamId.invalid')).optional(),
  applicant: ApplicantSchema,
});

export const AssignTeamSchema = z.object({
  teamId: z.string().uuid(t('validation.teamId.invalid')),
});

export const BulkSubmitSchema = z.object({
  applications: z.array(z.object({
    sessionId: z.string().uuid('Invalid Session ID'),
    teamId: z.string().uuid('Invalid Team ID'),
    applicant: ApplicantSchema,
  })).min(1, t('validation.applications.minCount')).max(500, t('validation.applications.maxCount')),
  options: z.object({
    validateTeamLimits: z.boolean().default(true),
    skipDuplicateNames: z.boolean().default(false),
  }).optional(),
});

export const BatchAssignSchema = z.object({
  teamIds: z.array(z.string().uuid(t('validation.teamId.invalid'))).min(1, t('validation.teams.minCount')).max(100, t('validation.teams.maxCount')),
  options: z.object({
    maxConcurrency: z.number().min(1).max(50).default(10),
    retryFailedRequests: z.boolean().default(true),
    includeJustifications: z.boolean().default(true),
  }).optional(),
});

export const BatchStatusSchema = z.object({
  teamIds: z.array(z.string().uuid()).optional(),
  sessionIds: z.array(z.string().uuid()).optional(),
  options: z.object({
    includeDetails: z.boolean().default(false),
    includeStats: z.boolean().default(false),
  }).optional(),
}).refine(
  (data) => data.teamIds || data.sessionIds,
  {
    message: t('validation.teamIds.required'),
  }
);

// NEW: Session Management Schemas
export const SessionSettingsSchema = z.object({
  maxTeams: z.number().min(1).max(1000).optional(),
  maxApplicantsPerTeam: z.number().min(2).max(10).default(10),
  allowSelfRegistration: z.boolean().default(true),
      sessionCode: z.string().regex(/^[A-Z0-9]{6}$/, t('validation.sessionCode.format')).optional(),
  raceMode: z.boolean().default(false).optional(),
});

export const CreateSessionSchema = z.object({
  name: z.string().min(1, t('validation.sessionName.required')).max(200, t('validation.sessionName.maxLength')),
  description: z.string().max(1000, t('validation.description.maxLength')).optional(),
  createdBy: z.string().min(1, t('validation.creator.required')).max(100, t('validation.creator.maxLength')),
  settings: SessionSettingsSchema.optional(),
  teamConfigs: z.array(z.object({
    name: z.string().min(1, t('validation.teamName.required')).max(100, t('validation.teamName.tooLong')),
    maxMembers: z.number().min(2, t('validation.teamMembers.min')).max(10, t('validation.teamMembers.max'))
  })).optional(),
});

export const UpdateSessionSchema = z.object({
  sessionId: z.string().uuid(t('validation.sessionId.invalid')),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  settings: SessionSettingsSchema.partial().optional(),
});

export const EndSessionSchema = z.object({
  sessionId: z.string().uuid(t('validation.sessionId.invalid')),
  confirmEnd: z.boolean().refine(val => val === true, t('validation.confirmEnd.required')),
  clearMemory: z.boolean().default(false),
  exportData: z.boolean().default(false),
});

export const JoinSessionSchema = z.object({
  sessionCode: z.string().regex(/^[A-Z0-9]{6}$/, t('validation.sessionCode.format')).optional(),
  sessionId: z.string().uuid(t('validation.sessionId.invalid')).optional(),
}).refine(
  (data) => data.sessionCode || data.sessionId,
  {
    message: t('validation.sessionCodeOrId.required'),
  }
);

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join(', ') };
    }
    return { success: false, error: t('validation.general.failed') };
  }
}

export const DEFAULT_ROLES = [
  '隊長', //captain
  '總設計師', //design head
  '技師', //engineer
  '輪胎經理', //tire and wheel changing
  '駕駛', //driver
  '安全責任者', //safety officer 
  '環境保護主任', //environmental officer
  '推車經理 1', //logistics manager
  '推車經理 2', 
  '啦啦隊', //cheerleader
] as const;

export const RACE_ROLES = [
  '駕駛', // driver
  '漏斗', // funnel
  '加油員 1', //gas 
  '加油員 2', 
  '推車 1', //push da car
  '推車 2',
  '輪胎技師 1', //change wheel
  '輪胎技師 2',
  '輪胎技師 3',
  '輪胎技師 4',
] as const;

export const ROLE_DESCRIPTIONS: { [key: string]: string } = {
  '隊長': '組織、領導團隊與決策。', // Captain: Organize, lead the team and make decisions.
  '總設計師': '負責賽車的設計。', // Design Head: Responsible for the design of the race car.
  '技師': '負責打造賽車並指定誰建造哪個部分。', // Engineer and Production Manager: Responsible for building the race car and designating who builds which parts.
  '輪胎經理': '學習並向團隊其他成員傳授如何更換輪胎的知識。', // Tire and Wheel Changing Manager: Learn and teach other team members how to change tires.
  '駕駛': '知道如何開得快。體重較輕者尤佳。', // Driver: Knows how to drive fast. Lighter weight preferred.
  '安全責任者': '檢查組員作業的安全及賽車的製造品質。確保團隊成員遵守規則。', // Safety Officer: Check the safety of team members' work and the manufacturing quality of the race car. Ensure team members follow the rules.
  '環境保護主任': '回收並確保所有東西都裝回原來的盒子裡。', // Environmental Officer: Recycle and ensure everything is put back in the original boxes.
  '推車經理 1': '推動賽車並將其移動到不同的位置。', // Logistics Manager 1: Push the race car and move it to different positions.
  '推車經理 2': '推動賽車並將其移動到不同的位置。', // Logistics Manager 2: Push the race car and move it to different positions.
  '啦啦隊': '建立團隊士氣。', // Cheerleader: Build team morale.

  '漏斗': '管理燃料流量和比賽期間的加油操作。', // Funnel: Manage fuel flow and refueling operations during the race.
  '加油員 1': '主要燃料處理員，負責快速安全的加油。', // Gas: Primary fuel handler, responsible for fast and safe refueling.
  '加油員 2': '輔助加油操作的次要燃料處理員。', // Gas 2: Secondary fuel handler assisting with refueling operations.
  '推車 1': '在維修站停靠期間協助推動和定位賽車。', // Push / Move Car 1: Assist with pushing and positioning the race car during pit stops.
  '推車 2': '在維修站停靠期間協助推動和定位賽車。', // Push / Move Car 2: Assist with pushing and positioning the race car during pit stops.
  '輪胎技師 1': '負責前輪的主要換輪員。', // Change Wheel 1: Primary wheel changer responsible for front wheels.
  '輪胎技師 2': '負責前輪的次要換輪員。', // Change Wheel 2: Secondary wheel changer responsible for front wheels.
  '輪胎技師 3': '負責後輪的主要換輪員。', // Change Wheel 3: Primary wheel changer responsible for rear wheels.
  '輪胎技師 4': '負責後輪的次要換輪員。', // Change Wheel 4: Secondary wheel changer responsible for rear wheels.
};

// Role mapping from part 1 to part 2 (race)
export const ROLE_MAPPING: { [key: string]: string } = {
  '隊長': '漏斗',
  '安全責任者': '加油員 1',
  '環境保護主任': '加油員 2',
  '推車經理 1': '推車 1',
  '推車經理 2': '推車 2',
  '輪胎經理': '輪胎技師 1',
  '總設計師': '輪胎技師 2',
  '技師': '輪胎技師 3',
  '啦啦隊': '輪胎技師 4'
};

// Function to get the appropriate role based on race mode
export function getRoleForMode(originalRole: string, isRaceMode: boolean): string {
  if (!isRaceMode) {
    return originalRole;
  }
  return ROLE_MAPPING[originalRole] || originalRole;
}

// Function to get all roles for a given mode
export function getRolesForMode(isRaceMode: boolean): readonly string[] {
  return isRaceMode ? RACE_ROLES : DEFAULT_ROLES;
}

// Role translation mapping - maps Chinese roles to translation keys
const DEFAULT_ROLE_TRANSLATION_MAP: { [chineseRole: string]: string } = {
  '隊長': 'roles.default.captain',
  '總設計師': 'roles.default.designHead',
  '技師': 'roles.default.engineer',
  '輪胎經理': 'roles.default.tireandwheel',
  '駕駛': 'roles.default.driver',
  '安全責任者': 'roles.default.safetyOfficer',
  '環境保護主任': 'roles.default.environmentalOfficer',
  '推車經理 1': 'roles.default.logisticsManager',
  '推車經理 2': 'roles.default.logisticsManager2',
  '啦啦隊': 'roles.default.cheerleader',
};

const RACE_ROLE_TRANSLATION_MAP: { [chineseRole: string]: string } = {
  '駕駛': 'roles.race.driver',
  '漏斗': 'roles.race.funnel',
  '加油員 1': 'roles.race.gas',
  '加油員 2': 'roles.race.gas2',
  '推車 1': 'roles.race.pushcar',
  '推車 2': 'roles.race.pushcar2',
  '輪胎技師 1': 'roles.race.changeWheel',
  '輪胎技師 2': 'roles.race.changeWheel2',
  '輪胎技師 3': 'roles.race.changeWheel3',
  '輪胎技師 4': 'roles.race.changeWheel4',
};

const ROLE_DESCRIPTION_TRANSLATION_MAP: { [chineseRole: string]: string } = {
  // Default roles
  '隊長': 'roles.descriptions.captain',
  '總設計師': 'roles.descriptions.designHead',
  '技師': 'roles.descriptions.engineer',
  '輪胎經理': 'roles.descriptions.tireandwheel',
  '駕駛': 'roles.descriptions.driver',
  '安全責任者': 'roles.descriptions.safetyOfficer',
  '環境保護主任': 'roles.descriptions.environmentalOfficer',
  '推車經理 1': 'roles.descriptions.logisticsManager',
  '推車經理 2': 'roles.descriptions.logisticsManager2',
  '啦啦隊': 'roles.descriptions.cheerleader',
  // Race roles
  '漏斗': 'roles.descriptions.funnel',
  '加油員 1': 'roles.descriptions.gas',
  '加油員 2': 'roles.descriptions.gas2',
  '推車 1': 'roles.descriptions.pushcar',
  '推車 2': 'roles.descriptions.pushcar2',
  '輪胎技師 1': 'roles.descriptions.changeWheel',
  '輪胎技師 2': 'roles.descriptions.changeWheel2',
  '輪胎技師 3': 'roles.descriptions.changeWheel3',
  '輪胎技師 4': 'roles.descriptions.changeWheel4',
};

// Function to get translated role name
export function getTranslatedRole(chineseRole: string, isRaceMode: boolean, t: TranslationFunction): string {
  const translationMap = isRaceMode ? RACE_ROLE_TRANSLATION_MAP : DEFAULT_ROLE_TRANSLATION_MAP;
  const translationKey = translationMap[chineseRole];
  return translationKey ? t(translationKey as any) : chineseRole;
}

// Function to get translated role description
export function getTranslatedRoleDescription(chineseRole: string, t: TranslationFunction): string {
  const translationKey = ROLE_DESCRIPTION_TRANSLATION_MAP[chineseRole];
  return translationKey ? t(translationKey as any) : ROLE_DESCRIPTIONS[chineseRole] || '';
}