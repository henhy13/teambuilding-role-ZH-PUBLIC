import { TranslationKeys } from './types';

export const en: TranslationKeys = {
  // Common UI elements
  'common.joinSession': 'Join Session',
  'common.teams': 'Teams',
  'common.results': 'Results',
  'common.currentSession': 'Current Session:',
  'common.adminPassword': 'Admin Password',
  'common.login': 'Login',
  'common.joining': 'Joining...',
  'common.loading': '...',
  
  // Homepage
  'home.title.teamRole': 'Team',
  'home.title.assignment': 'Role Assignment',
  'home.subtitle': 'Enter your session code to join',
  'home.joinMeeting': 'Join Meeting',
  'home.sessionCode': 'Session Code',
  'home.sessionCodePlaceholder': 'ABC123',
  'home.sessionCodeDescription': 'Enter the 6-digit code provided by the meeting organizer',
  'home.joinButton': 'Join Meeting',
  'home.joiningButton': 'Joining...',
  
  // Form validation
  'validation.sessionCodeRequired': 'Please enter session code',
  'validation.sessionCodeFormat': 'Please enter 6 letters or numbers',
  'validation.invalidSessionCode': 'Invalid session code',
  'validation.authenticationFailed': 'Authentication failed',
  'validation.networkError': 'Network error. Please try again.',
  
  // Meta
  'meta.title': 'Team Role Assignment System',
  'meta.description': 'Team role assignment system',
  
  // Footer
  'footer.creditPolicy': 'Credit & Policy',
  
  // Teams page
  'teams.pageTitle': 'Team Selection',
  'teams.sessionCode': 'Session Code:',
  'teams.loading': 'Loading session...',
  'teams.emptyState.title': 'No teams found.',
  'teams.emptyState.description': 'Teams will appear here once they are created.',
  
  // Team sections
  'teams.openTeams.title': 'Teams Accepting Members',
  'teams.completedTeams.title': 'Completed Teams',
  
  // Team status
  'teams.status.open': 'Open',
  'teams.status.full': 'Full',
  'teams.status.accepting': ' Accepting members',
  'teams.status.readyForAssignment': 'Ready for role assignment',
  'teams.capacity': 'Capacity:',
  'teams.currentMembers': 'Current Members:',
  'teams.noMembers': 'No members yet',
  'teams.moreMembers': 'more members',
  
  // Team actions
  'teams.joinTeam': 'Join Team',
  'teams.joining': 'Joining...',
  'teams.viewResults': 'View Results',
  
  // Join form
  'teams.joinForm.title': 'Join',
  'teams.joinForm.personalInfo': 'Personal Information',
  'teams.joinForm.fullName': 'Full Name *',
  'teams.joinForm.fullNamePlaceholder': 'Enter your full name',
  'teams.joinForm.occupation': 'Current Occupation *',
  'teams.joinForm.occupationPlaceholder': 'e.g., Software Engineer, Marketing Manager, Student',
  'teams.joinForm.experience': 'Years of Experience in this Role *',
  'teams.joinForm.experienceYears': 'Years',
  'teams.joinForm.experienceMonths': 'Months',
  'teams.joinForm.experienceYearsHelp': 'Please enter 1-70 years of work experience',
  'teams.joinForm.experienceMonthsHelp': 'Please enter 1-11 months of work experience',
  'teams.joinForm.skillsTitle': 'Skills (Up to 5)',
  'teams.joinForm.skillsDescription': 'List your relevant technical and professional skills',
  'teams.joinForm.skillPlaceholder': 'Skill',
  'teams.joinForm.addSkill': 'Add Skill',
  'teams.joinForm.traitsTitle': 'Personality Traits (Up to 5)',
  'teams.joinForm.traitsDescription': 'Describe your personality traits and work style',
  'teams.joinForm.traitPlaceholder': 'Trait',
  'teams.joinForm.addTrait': 'Add Trait',
  'teams.joinForm.characters': 'characters',
  'teams.joinForm.remove': 'Remove',
  'teams.joinForm.cancel': 'Cancel',
  
  // Form validation - teams specific
  'teams.validation.fullNameRequired': 'Please enter your full name',
  'teams.validation.occupationRequired': 'Please enter your occupation',
  'teams.validation.experienceRequired': 'Please enter years of experience',
  'teams.validation.skillsRequired': 'Please add at least one skill',
  'teams.validation.traitsRequired': 'Please add at least one personality trait',
  'teams.validation.joinTeamFailed': 'Failed to join team',
  
  // Additional labels
  'teams.status.label': 'Status:',
  'teams.capacity.members': 'members',
  'teams.morePrefix': '... and',
  'teams.joinForm.traitExamples': '(e.g., collaborative, analytical, creative)',
  
  // Results page
  'results.pageTitle': 'Team Details',
  'results.sessionCode': 'Session Code:',
  'results.loading': 'Loading...',
  'results.loadingTeams': 'Loading team results...',
  'results.loadingFailed': 'Loading Failed',
  'results.reload': 'Reload',
  'results.emptyState.title': 'No teams found for this session.',
  'results.emptyState.description': 'Teams will appear here after participants join and roles are assigned.',
  
  // Team results display
  'results.team.members': 'members',
  'results.team.completed': 'Completed',
  'results.team.inProgress': 'In Progress',
  'results.team.viewRoles': 'View Team Roles',
  'results.team.autoUpdating': '(Auto-updating)',
  'results.team.status': 'Status:',
  'results.team.contactAdmin': '• Please contact administrator',
  'results.team.refreshLater': '• Please refresh later',
  
  // Processing status translations
  'results.status.pending': 'Pending',
  'results.status.scoring': 'Scoring',
  'results.status.assigning': 'Assigning',
  'results.status.justifying': 'Generating explanations',
  'results.status.complete': 'Complete',
  'results.status.error': 'Processing error',
  
  // Summary section
  'results.summary.title': 'Session Summary',
  'results.summary.totalTeams': 'Total Teams',
  'results.summary.totalParticipants': 'Total Participants',
  'results.summary.completedTeams': 'Completed Teams',
  'results.summary.assignedRoles': 'Assigned Roles',
  
  // Team details page
  'teamDetails.pageTitle': 'Team Details',
  'teamDetails.backToResults': 'Back to Results',
  'teamDetails.sessionCode': 'Session Code:',
  'teamDetails.loading': 'Loading...',
  'teamDetails.loadingTeamDetails': 'Loading team details...',
  'teamDetails.loadingFailed': 'Loading Failed',
  'teamDetails.reload': 'Reload',
  'teamDetails.teamNotFound': 'Team not found',
  'teamDetails.backToResultsLink': 'Back to Results',
  
  // Team status section
  'teamDetails.status.members': 'members',
  'teamDetails.status.completed': 'Completed',
  'teamDetails.status.inProgress': 'In Progress',
  'teamDetails.status.autoUpdating': '(Auto-updating)',
  'teamDetails.status.label': 'Status:',
  'teamDetails.status.contactAdmin': '• Please contact administrator',
  'teamDetails.status.refreshLater': '• Please refresh later',
  
  // Race mode
  'teamDetails.raceMode.title': '🏁 Race Roles:',
  'teamDetails.raceMode.description': 'View your updated roles and prepare for the race with your team! 🏎️⚡',
  
  // Processing messages
  'teamDetails.processing.generatingAI': 'Generating AI explanations for role assignments...',
  'teamDetails.processing.completed': 'Role assignment complete!',
  'teamDetails.processing.generating': 'Generating role assignments...',
  
  // Team members section
  'teamDetails.members.title': 'Team Members & Roles',
  'teamDetails.members.noMembers': 'No members yet',
  'teamDetails.members.unassignedRole': 'Unassigned',
  'teamDetails.members.roleResponsibility': 'Role Responsibility:',
  'teamDetails.members.occupation': 'Occupation:',
  'teamDetails.members.whyThisRole': 'Why this role:',
  'teamDetails.members.teamCompatibility': 'Team Compatibility:',
  'teamDetails.members.skills': 'Skills:',
  'teamDetails.members.personality': 'Personality:',
  
  // Team overview section
  'teamDetails.overview.title': 'Team Overview',
  
  // Error messages
  'teamDetails.error.teamNotFound': 'Team not found',
  
  // Admin Dashboard
  'admin.dashboard.title': 'Admin Dashboard',
  'admin.dashboard.systemMaintenance': '⚠️ Debug Tool',
  'admin.dashboard.processing': 'Processing...',
  'admin.dashboard.createNewSession': 'Create New Session',
  'admin.dashboard.logout': 'Logout',
  'admin.dashboard.sessionCreated': 'Session created successfully',
  'admin.dashboard.sessionCode': 'Code:',
  'admin.dashboard.teams': 'Teams: ',
  'admin.dashboard.totalCapacity': 'Total capacity:',
  'admin.dashboard.participants': 'participants',
  
  // Create Session Modal
  'admin.createSession.title': 'Create New Session',
  'admin.createSession.sessionName': 'Session Name *',
  'admin.createSession.sessionNamePlaceholder': 'e.g., Hackathon 2024, Team Building Workshop',
  'admin.createSession.sessionNameRequired': 'Please enter session name',
  'admin.createSession.customSessionCode': 'Custom Session Code',
  'admin.createSession.customSessionCodePlaceholder': 'Leave blank to auto-generate',
  'admin.createSession.description': 'Description',
  'admin.createSession.descriptionPlaceholder': 'Optional description of the session',
  'admin.createSession.cancel': 'Cancel',
  'admin.createSession.creating': 'Creating...',
  'admin.createSession.createSession': 'Create Session',
  
  // Session Card
  'admin.sessionCard.status.active': 'Active',
  'admin.sessionCard.status.ended': 'Ended',
  'admin.sessionCard.status.archived': 'Archived',
  'admin.sessionCard.raceMode': 'Race Mode',
  'admin.sessionCard.updating': 'Updating...',
  'admin.sessionCard.disableRaceMode': '❎️Disable Race Mode',
  'admin.sessionCard.enableRaceMode': '✅️Enable Race Mode',
  'admin.sessionCard.deleting': 'Deleting...',
  'admin.sessionCard.deleteSession': 'Delete Session',
  'admin.sessionCard.createdAt': 'Created:',
  'admin.sessionCard.teams': 'Teams: ',
  'admin.sessionCard.participants': 'Participants: ',
  'admin.sessionCard.endedAt': 'Ended:',
  
  // Sessions List
  'admin.sessionsList.noSessions': 'No Sessions',
  'admin.sessionsList.createNewSession': 'Create a new session to get started.',
  
  // Team Config Form
  'admin.teamConfig.title': 'Team Configuration',
  'admin.teamConfig.addTeam': '+ Add Team',
  'admin.teamConfig.noTeamsMessage': 'No teams configured yet. Click "Add Team" to get started.',
  'admin.teamConfig.teamNamePlaceholder': 'Team Name',
  'admin.teamConfig.teamNameRequired': 'Please enter team name',
  'admin.teamConfig.maxMembersRequired': 'Please enter team member limit',
  'admin.teamConfig.totalCapacity': 'Total participant capacity:',
  'admin.teamConfig.defaultTeamName': 'Team',
  
  // Layout Header
  'layout.header.currentSession': 'Current Session:',
  'layout.header.adminPasswordPlaceholder': 'Admin Password',
  'layout.header.login': 'Login',
  'layout.header.loading': '...',
  'layout.navigation.joinSession': 'Join Session',
  'layout.navigation.teams': 'Teams',
  'layout.navigation.results': 'Results',
  'layout.errors.authFailed': 'Authentication failed',
  'layout.errors.networkError': 'Network error. Please try again.',
  
  // Validation Error Messages
  'validation.name.required': 'Name is required',
  'validation.name.maxLength': 'Name cannot exceed 50 characters',
  'validation.occupation.required': 'Occupation is required',
  'validation.occupation.maxLength': 'Occupation cannot exceed 100 characters',
  'validation.experience.negative': 'Years of experience cannot be negative',
  'validation.experience.maxValue': 'Years of experience cannot exceed 70 years',
  'validation.skills.required': 'Each skill cannot exceed 30 characters',
  'validation.skills.maxLength': 'Each skill cannot exceed 30 characters',
  'validation.skills.minCount': 'At least one skill is required',
  'validation.skills.maxCount': 'Maximum 5 skills allowed',
  'validation.traits.required': 'Each personality trait cannot exceed 40 characters',
  'validation.traits.maxLength': 'Each personality trait cannot exceed 40 characters',
  'validation.traits.minCount': 'At least one personality trait is required',
  'validation.traits.maxCount': 'Maximum 5 personality traits allowed',
  'validation.teamName.required': 'Team name is required',
  'validation.teamName.tooLong': 'Team name is too long',
  'validation.sessionId.invalid': 'Invalid session ID',
  'validation.teamId.invalid': 'Invalid team ID',
  'validation.applications.minCount': 'At least one application is required',
  'validation.applications.maxCount': 'Too many applications (maximum 500)',
  'validation.teams.minCount': 'At least one team is required',
  'validation.teams.maxCount': 'Too many teams (maximum 100)',
  'validation.teamIds.required': 'Must provide team IDs or session IDs',
  'validation.sessionCode.format': 'Session code must be 6 uppercase letters or numbers',
  'validation.sessionName.required': 'Session name is required',
  'validation.sessionName.maxLength': 'Session name is too long',
  'validation.description.maxLength': 'Description is too long',
  'validation.creator.required': 'Creator identifier is required',
  'validation.creator.maxLength': 'Creator name is too long',
  'validation.teamMembers.min': 'Minimum 2 members required',
  'validation.teamMembers.max': 'Maximum 10 members allowed',
  'validation.confirmEnd.required': 'Must confirm session end',
  'validation.sessionCodeOrId.required': 'Must provide session code or session ID',
  'validation.general.failed': 'Validation failed',

  // Role names - Default mode
  'roles.default.captain': 'Captain',
  'roles.default.designHead': 'Design Head',
  'roles.default.engineer': 'Engineer',
  'roles.default.tireandwheel': 'Tire Manager',
  'roles.default.driver': 'Driver',
  'roles.default.safetyOfficer': 'Safety Officer',
  'roles.default.environmentalOfficer': 'Environmental Officer',
  'roles.default.logisticsManager': 'Logistics Manager 1',
  'roles.default.logisticsManager2': 'Logistics Manager 2',
  'roles.default.cheerleader': 'Cheerleader',

  // Role names - Race mode
  'roles.race.driver': 'Driver',
  'roles.race.funnel': 'Funnel',
  'roles.race.gas': 'Gas 1',
  'roles.race.gas2': 'Gas 2',
  'roles.race.pushcar': 'Push Car 1',
  'roles.race.pushcar2': 'Push Car 2',
  'roles.race.changeWheel': 'Tire Technician 1',
  'roles.race.changeWheel2': 'Tire Technician 2',
  'roles.race.changeWheel3': 'Tire Technician 3',
  'roles.race.changeWheel4': 'Tire Technician 4',

  // Role descriptions - Default mode
  'roles.descriptions.captain': 'Organize, lead the team and make decisions.',
  'roles.descriptions.designHead': 'Responsible for the design of the race car.',
  'roles.descriptions.engineer': 'Responsible for building the race car and designating who builds which parts.',
  'roles.descriptions.tireandwheel': 'Learn and teach other team members how to change tires.',
  'roles.descriptions.driver': 'Knows how to drive fast. Lighter weight preferred.',
  'roles.descriptions.safetyOfficer': 'Check the safety of team members\' work and the manufacturing quality of the race car. Ensure team members follow the rules.',
  'roles.descriptions.environmentalOfficer': 'Recycle and ensure everything is put back in the original boxes.',
  'roles.descriptions.logisticsManager': 'Push the race car and move it to different positions.',
  'roles.descriptions.logisticsManager2': 'Push the race car and move it to different positions.',
  'roles.descriptions.cheerleader': 'Build team morale.',

  // Role descriptions - Race mode
  'roles.descriptions.funnel': 'Manage fuel flow and refueling operations during the race.',
  'roles.descriptions.gas': 'Primary fuel handler, responsible for fast and safe refueling.',
  'roles.descriptions.gas2': 'Secondary fuel handler assisting with refueling operations.',
  'roles.descriptions.pushcar': 'Assist with pushing and positioning the race car during pit stops.',
  'roles.descriptions.pushcar2': 'Assist with pushing and positioning the race car during pit stops.',
  'roles.descriptions.changeWheel': 'Primary wheel changer responsible for front wheels.',
  'roles.descriptions.changeWheel2': 'Secondary wheel changer responsible for front wheels.',
  'roles.descriptions.changeWheel3': 'Primary wheel changer responsible for rear wheels.',
  'roles.descriptions.changeWheel4': 'Secondary wheel changer responsible for rear wheels.',
};