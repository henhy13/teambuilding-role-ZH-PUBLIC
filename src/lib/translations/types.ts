export type Language = 'en' | 'zh';

export interface TranslationKeys {
  // Common UI elements
  'common.joinSession': string;
  'common.teams': string;
  'common.results': string;
  'common.currentSession': string;
  'common.adminPassword': string;
  'common.login': string;
  'common.joining': string;
  'common.loading': string;
  
  // Homepage
  'home.title.teamRole': string;
  'home.title.assignment': string;
  'home.subtitle': string;
  'home.joinMeeting': string;
  'home.sessionCode': string;
  'home.sessionCodePlaceholder': string;
  'home.sessionCodeDescription': string;
  'home.joinButton': string;
  'home.joiningButton': string;
  
  // Form validation
  'validation.sessionCodeRequired': string;
  'validation.sessionCodeFormat': string;
  'validation.invalidSessionCode': string;
  'validation.authenticationFailed': string;
  'validation.networkError': string;
  
  // Meta
  'meta.title': string;
  'meta.description': string;
  
  // Footer
  'footer.creditPolicy': string;
  
  // Teams page
  'teams.pageTitle': string;
  'teams.sessionCode': string;
  'teams.loading': string;
  'teams.emptyState.title': string;
  'teams.emptyState.description': string;
  
  // Team sections
  'teams.openTeams.title': string;
  'teams.completedTeams.title': string;
  
  // Team status
  'teams.status.open': string;
  'teams.status.full': string;
  'teams.status.accepting': string;
  'teams.status.readyForAssignment': string;
  'teams.capacity': string;
  'teams.currentMembers': string;
  'teams.noMembers': string;
  'teams.moreMembers': string;
  
  // Team actions
  'teams.joinTeam': string;
  'teams.joining': string;
  'teams.viewResults': string;
  
  // Join form
  'teams.joinForm.title': string;
  'teams.joinForm.personalInfo': string;
  'teams.joinForm.fullName': string;
  'teams.joinForm.fullNamePlaceholder': string;
  'teams.joinForm.occupation': string;
  'teams.joinForm.occupationPlaceholder': string;
  'teams.joinForm.experience': string;
  'teams.joinForm.experienceYears': string;
  'teams.joinForm.experienceMonths': string;
  'teams.joinForm.experienceYearsHelp': string;
  'teams.joinForm.experienceMonthsHelp': string;
  'teams.joinForm.skillsTitle': string;
  'teams.joinForm.skillsDescription': string;
  'teams.joinForm.skillPlaceholder': string;
  'teams.joinForm.addSkill': string;
  'teams.joinForm.traitsTitle': string;
  'teams.joinForm.traitsDescription': string;
  'teams.joinForm.traitPlaceholder': string;
  'teams.joinForm.addTrait': string;
  'teams.joinForm.characters': string;
  'teams.joinForm.remove': string;
  'teams.joinForm.cancel': string;
  
  // Form validation - teams specific
  'teams.validation.fullNameRequired': string;
  'teams.validation.occupationRequired': string;
  'teams.validation.experienceRequired': string;
  'teams.validation.skillsRequired': string;
  'teams.validation.traitsRequired': string;
  'teams.validation.joinTeamFailed': string;
  
  // Additional labels
  'teams.status.label': string;
  'teams.capacity.members': string;
  'teams.morePrefix': string;
  'teams.joinForm.traitExamples': string;
  
  // Results page
  'results.pageTitle': string;
  'results.sessionCode': string;
  'results.loading': string;
  'results.loadingTeams': string;
  'results.loadingFailed': string;
  'results.reload': string;
  'results.emptyState.title': string;
  'results.emptyState.description': string;
  
  // Team results display
  'results.team.members': string;
  'results.team.completed': string;
  'results.team.inProgress': string;
  'results.team.viewRoles': string;
  'results.team.autoUpdating': string;
  'results.team.status': string;
  'results.team.contactAdmin': string;
  'results.team.refreshLater': string;
  
  // Processing status translations
  'results.status.pending': string;
  'results.status.scoring': string;
  'results.status.assigning': string;
  'results.status.justifying': string;
  'results.status.complete': string;
  'results.status.error': string;
  
  // Summary section
  'results.summary.title': string;
  'results.summary.totalTeams': string;
  'results.summary.totalParticipants': string;
  'results.summary.completedTeams': string;
  'results.summary.assignedRoles': string;
  
  // Team details page
  'teamDetails.pageTitle': string;
  'teamDetails.backToResults': string;
  'teamDetails.sessionCode': string;
  'teamDetails.loading': string;
  'teamDetails.loadingTeamDetails': string;
  'teamDetails.loadingFailed': string;
  'teamDetails.reload': string;
  'teamDetails.teamNotFound': string;
  'teamDetails.backToResultsLink': string;
  
  // Team status section
  'teamDetails.status.members': string;
  'teamDetails.status.completed': string;
  'teamDetails.status.inProgress': string;
  'teamDetails.status.autoUpdating': string;
  'teamDetails.status.label': string;
  'teamDetails.status.contactAdmin': string;
  'teamDetails.status.refreshLater': string;
  
  // Race mode
  'teamDetails.raceMode.title': string;
  'teamDetails.raceMode.description': string;
  
  // Processing messages
  'teamDetails.processing.generatingAI': string;
  'teamDetails.processing.completed': string;
  'teamDetails.processing.generating': string;
  
  // Team members section
  'teamDetails.members.title': string;
  'teamDetails.members.noMembers': string;
  'teamDetails.members.unassignedRole': string;
  'teamDetails.members.roleResponsibility': string;
  'teamDetails.members.occupation': string;
  'teamDetails.members.whyThisRole': string;
  'teamDetails.members.teamCompatibility': string;
  'teamDetails.members.skills': string;
  'teamDetails.members.personality': string;
  
  // Team overview section
  'teamDetails.overview.title': string;
  
  // Error messages
  'teamDetails.error.teamNotFound': string;
  
  // Admin Dashboard
  'admin.dashboard.title': string;
  'admin.dashboard.systemMaintenance': string;
  'admin.dashboard.processing': string;
  'admin.dashboard.createNewSession': string;
  'admin.dashboard.logout': string;
  'admin.dashboard.sessionCreated': string;
  'admin.dashboard.sessionCode': string;
  'admin.dashboard.teams': string;
  'admin.dashboard.totalCapacity': string;
  'admin.dashboard.participants': string;
  
  // Create Session Modal
  'admin.createSession.title': string;
  'admin.createSession.sessionName': string;
  'admin.createSession.sessionNamePlaceholder': string;
  'admin.createSession.sessionNameRequired': string;
  'admin.createSession.customSessionCode': string;
  'admin.createSession.customSessionCodePlaceholder': string;
  'admin.createSession.description': string;
  'admin.createSession.descriptionPlaceholder': string;
  'admin.createSession.cancel': string;
  'admin.createSession.creating': string;
  'admin.createSession.createSession': string;
  
  // Session Card
  'admin.sessionCard.status.active': string;
  'admin.sessionCard.status.ended': string;
  'admin.sessionCard.status.archived': string;
  'admin.sessionCard.raceMode': string;
  'admin.sessionCard.updating': string;
  'admin.sessionCard.disableRaceMode': string;
  'admin.sessionCard.enableRaceMode': string;
  'admin.sessionCard.deleting': string;
  'admin.sessionCard.deleteSession': string;
  'admin.sessionCard.createdAt': string;
  'admin.sessionCard.teams': string;
  'admin.sessionCard.participants': string;
  'admin.sessionCard.endedAt': string;
  
  // Sessions List
  'admin.sessionsList.noSessions': string;
  'admin.sessionsList.createNewSession': string;
  
  // Team Config Form
  'admin.teamConfig.title': string;
  'admin.teamConfig.addTeam': string;
  'admin.teamConfig.noTeamsMessage': string;
  'admin.teamConfig.teamNamePlaceholder': string;
  'admin.teamConfig.teamNameRequired': string;
  'admin.teamConfig.maxMembersRequired': string;
  'admin.teamConfig.totalCapacity': string;
  'admin.teamConfig.defaultTeamName': string;
  
  // Layout Header
  'layout.header.currentSession': string;
  'layout.header.adminPasswordPlaceholder': string;
  'layout.header.login': string;
  'layout.header.loading': string;
  'layout.navigation.joinSession': string;
  'layout.navigation.teams': string;
  'layout.navigation.results': string;
  'layout.errors.authFailed': string;
  'layout.errors.networkError': string;
  
  // Validation Error Messages
  'validation.name.required': string;
  'validation.name.maxLength': string;
  'validation.occupation.required': string;
  'validation.occupation.maxLength': string;
  'validation.experience.negative': string;
  'validation.experience.maxValue': string;
  'validation.skills.required': string;
  'validation.skills.maxLength': string;
  'validation.skills.minCount': string;
  'validation.skills.maxCount': string;
  'validation.traits.required': string;
  'validation.traits.maxLength': string;
  'validation.traits.minCount': string;
  'validation.traits.maxCount': string;
  'validation.teamName.required': string;
  'validation.teamName.tooLong': string;
  'validation.sessionId.invalid': string;
  'validation.teamId.invalid': string;
  'validation.applications.minCount': string;
  'validation.applications.maxCount': string;
  'validation.teams.minCount': string;
  'validation.teams.maxCount': string;
  'validation.teamIds.required': string;
  'validation.sessionCode.format': string;
  'validation.sessionName.required': string;
  'validation.sessionName.maxLength': string;
  'validation.description.maxLength': string;
  'validation.creator.required': string;
  'validation.creator.maxLength': string;
  'validation.teamMembers.min': string;
  'validation.teamMembers.max': string;
  'validation.confirmEnd.required': string;
  'validation.sessionCodeOrId.required': string;
  'validation.general.failed': string;

  // Role names - Default mode
  'roles.default.captain': string;
  'roles.default.designHead': string;
  'roles.default.engineer': string;
  'roles.default.tireandwheel': string;
  'roles.default.driver': string;
  'roles.default.safetyOfficer': string;
  'roles.default.environmentalOfficer': string;
  'roles.default.logisticsManager': string;
  'roles.default.logisticsManager2': string;
  'roles.default.cheerleader': string;

  // Role names - Race mode
  'roles.race.driver': string;
  'roles.race.funnel': string;
  'roles.race.gas': string;
  'roles.race.gas2': string;
  'roles.race.pushcar': string;
  'roles.race.pushcar2': string;
  'roles.race.changeWheel': string;
  'roles.race.changeWheel2': string;
  'roles.race.changeWheel3': string;
  'roles.race.changeWheel4': string;

  // Role descriptions - Default mode
  'roles.descriptions.captain': string;
  'roles.descriptions.designHead': string;
  'roles.descriptions.engineer': string;
  'roles.descriptions.tireandwheel': string;
  'roles.descriptions.driver': string;
  'roles.descriptions.safetyOfficer': string;
  'roles.descriptions.environmentalOfficer': string;
  'roles.descriptions.logisticsManager': string;
  'roles.descriptions.logisticsManager2': string;
  'roles.descriptions.cheerleader': string;

  // Role descriptions - Race mode
  'roles.descriptions.funnel': string;
  'roles.descriptions.gas': string;
  'roles.descriptions.gas2': string;
  'roles.descriptions.pushcar': string;
  'roles.descriptions.pushcar2': string;
  'roles.descriptions.changeWheel': string;
  'roles.descriptions.changeWheel2': string;
  'roles.descriptions.changeWheel3': string;
  'roles.descriptions.changeWheel4': string;
}

export type TranslationFunction = (key: keyof TranslationKeys) => string;