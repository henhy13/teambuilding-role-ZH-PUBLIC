import { TranslationKeys } from './types';

export const zh: TranslationKeys = {
  // Common UI elements
  'common.joinSession': '加入會議',
  'common.teams': '團隊',
  'common.results': '結果',
  'common.currentSession': '目前會議：',
  'common.adminPassword': '管理員密碼',
  'common.login': '登入',
  'common.joining': '加入中...',
  'common.loading': '...',
  
  // Homepage
  'home.title.teamRole': '小組',
  'home.title.assignment': '角色分配',
  'home.subtitle': '輸入您的會議代碼以加入',
  'home.joinMeeting': '加入會議',
  'home.sessionCode': '會議代碼',
  'home.sessionCodePlaceholder': 'ABC123',
  'home.sessionCodeDescription': '輸入會議組織者提供的6位代碼',
  'home.joinButton': '加入會議',
  'home.joiningButton': '加入中...',
  
  // Form validation
  'validation.sessionCodeRequired': '請輸入會話代碼',
  'validation.sessionCodeFormat': '請輸入6位英文字母或數字',
  'validation.invalidSessionCode': '無效的會議代碼',
  'validation.authenticationFailed': '身份驗證失敗',
  'validation.networkError': '網路錯誤。請重試。',
  
  // Meta
  'meta.title': 'Team Role Assignment System',
  'meta.description': 'Team role assignment system',
  
  // Footer
  'footer.creditPolicy': '詳細資訊',
  
  // Teams page
  'teams.pageTitle': '團隊選擇',
  'teams.sessionCode': '會議代碼:',
  'teams.loading': '載入會議中...',
  'teams.emptyState.title': '找不到團隊。',
  'teams.emptyState.description': '團隊建立後將會顯示在此。',
  
  // Team sections
  'teams.openTeams.title': '接受成員的團隊',
  'teams.completedTeams.title': '已完成團隊',
  
  // Team status
  'teams.status.open': '開放',
  'teams.status.full': '已滿',
  'teams.status.accepting': '接受成員中',
  'teams.status.readyForAssignment': '準備進行角色分配',
  'teams.capacity': '容量：',
  'teams.currentMembers': '目前成員：',
  'teams.noMembers': '尚無成員',
  'teams.moreMembers': '位成員',
  
  // Team actions
  'teams.joinTeam': '加入團隊',
  'teams.joining': '加入中...',
  'teams.viewResults': '查看結果',
  
  // Join form
  'teams.joinForm.title': '加入',
  'teams.joinForm.personalInfo': '個人資訊',
  'teams.joinForm.fullName': '全名 *',
  'teams.joinForm.fullNamePlaceholder': '輸入您的全名',
  'teams.joinForm.occupation': '目前職業 *',
  'teams.joinForm.occupationPlaceholder': '例如：軟體工程師、市場經理、學生',
  'teams.joinForm.experience': '此職業工作年資 *',
  'teams.joinForm.experienceYears': '年',
  'teams.joinForm.experienceMonths': '月',
  'teams.joinForm.experienceYearsHelp': '請輸入 1-70 年的工作經驗',
  'teams.joinForm.experienceMonthsHelp': '請輸入 1-11 個月的工作經驗',
  'teams.joinForm.skillsTitle': '技能（最多 5 項）',
  'teams.joinForm.skillsDescription': '列出您相關的技術與專業技能',
  'teams.joinForm.skillPlaceholder': '技能',
  'teams.joinForm.addSkill': '新增技能',
  'teams.joinForm.traitsTitle': '個性特質（最多 5 項）',
  'teams.joinForm.traitsDescription': '描述您的個性特質與工作風格',
  'teams.joinForm.traitPlaceholder': '特質',
  'teams.joinForm.addTrait': '新增特質',
  'teams.joinForm.characters': '字元',
  'teams.joinForm.remove': '移除',
  'teams.joinForm.cancel': '取消',
  
  // Form validation - teams specific
  'teams.validation.fullNameRequired': '請輸入您的全名',
  'teams.validation.occupationRequired': '請輸入您的職業',
  'teams.validation.experienceRequired': '請輸入工作經驗年數',
  'teams.validation.skillsRequired': '請至少新增一項技能',
  'teams.validation.traitsRequired': '請至少新增一項個人特質',
  'teams.validation.joinTeamFailed': '加入團隊失敗',
  
  // Additional labels
  'teams.status.label': '狀態：',
  'teams.capacity.members': '成員',
  'teams.morePrefix': '... 還有',
  'teams.joinForm.traitExamples': '（例如：合作、分析、創意）',
  
  // Results page
  'results.pageTitle': '團隊詳細資料',
  'results.sessionCode': '會議代碼:',
  'results.loading': '載入中...',
  'results.loadingTeams': '載入團隊結果中...',
  'results.loadingFailed': '載入失敗',
  'results.reload': '重新載入',
  'results.emptyState.title': '此會議找不到團隊。',
  'results.emptyState.description': '參與者加入並分配角色後，團隊將顯示在此。',
  
  // Team results display
  'results.team.members': '成員',
  'results.team.completed': '已完成',
  'results.team.inProgress': '進行中',
  'results.team.viewRoles': '查看團隊角色',
  'results.team.autoUpdating': '(自動更新中)',
  'results.team.status': '狀態:',
  'results.team.contactAdmin': '• 請聯繫管理員',
  'results.team.refreshLater': '• 請稍後刷新',
  
  // Processing status translations
  'results.status.pending': '等待中',
  'results.status.scoring': '評分中',
  'results.status.assigning': '分配中',
  'results.status.justifying': '生成說明中',
  'results.status.complete': '已完成',
  'results.status.error': '處理錯誤',
  
  // Summary section
  'results.summary.title': '會議摘要',
  'results.summary.totalTeams': '團隊總數',
  'results.summary.totalParticipants': '參與者總數',
  'results.summary.completedTeams': '完成團隊',
  'results.summary.assignedRoles': '已分配角色',
  
  // Team details page
  'teamDetails.pageTitle': '團隊詳細資料',
  'teamDetails.backToResults': '返回結果頁面',
  'teamDetails.sessionCode': '會議代碼:',
  'teamDetails.loading': '載入中...',
  'teamDetails.loadingTeamDetails': '正在載入團隊詳細資料...',
  'teamDetails.loadingFailed': '載入失敗',
  'teamDetails.reload': '重新載入',
  'teamDetails.teamNotFound': '找不到團隊',
  'teamDetails.backToResultsLink': '返回結果',
  
  // Team status section
  'teamDetails.status.members': '成員',
  'teamDetails.status.completed': '已完成',
  'teamDetails.status.inProgress': '進行中',
  'teamDetails.status.autoUpdating': '(自動更新中)',
  'teamDetails.status.label': '狀態:',
  'teamDetails.status.contactAdmin': '• 請聯繫管理員',
  'teamDetails.status.refreshLater': '• 請稍後刷新',
  
  // Race mode
  'teamDetails.raceMode.title': '🏁 競賽角色:',
  'teamDetails.raceMode.description': '查看您更新的角色並與您的團隊一起準備比賽！🏎️⚡',
  
  // Processing messages
  'teamDetails.processing.generatingAI': '正在為角色分配生成AI說明...',
  'teamDetails.processing.completed': '角色分配完成！',
  'teamDetails.processing.generating': '正在生成角色分配...',
  
  // Team members section
  'teamDetails.members.title': '團隊成員與角色',
  'teamDetails.members.noMembers': '尚無成員',
  'teamDetails.members.unassignedRole': '未分配角色',
  'teamDetails.members.roleResponsibility': '角色職責:',
  'teamDetails.members.occupation': '職業:',
  'teamDetails.members.whyThisRole': '為什麼是這個角色:',
  'teamDetails.members.teamCompatibility': '團隊相容性:',
  'teamDetails.members.skills': '技能:',
  'teamDetails.members.personality': '個性:',
  
  // Team overview section
  'teamDetails.overview.title': '團隊概覽',
  
  // Error messages
  'teamDetails.error.teamNotFound': '找不到團隊',
  
  // Admin Dashboard
  'admin.dashboard.title': '管理員面板',
  'admin.dashboard.systemMaintenance': '⚠️ Debug Tool',
  'admin.dashboard.processing': '處理中...',
  'admin.dashboard.createNewSession': '建立新會議',
  'admin.dashboard.logout': '登出',
  'admin.dashboard.sessionCreated': '會議建立成功',
  'admin.dashboard.sessionCode': '代碼：',
  'admin.dashboard.teams': '團隊：',
  'admin.dashboard.totalCapacity': '總容量：',
  'admin.dashboard.participants': '名參與者',
  
  // Create Session Modal
  'admin.createSession.title': '建立新會議',
  'admin.createSession.sessionName': '會議名稱 *',
  'admin.createSession.sessionNamePlaceholder': '例如：黑客松 2024、團隊建設工作坊',
  'admin.createSession.sessionNameRequired': '請輸入會議名稱',
  'admin.createSession.customSessionCode': '自訂會議代碼',
  'admin.createSession.customSessionCodePlaceholder': '留空以自動生成',
  'admin.createSession.description': '描述',
  'admin.createSession.descriptionPlaceholder': '會議的可選描述',
  'admin.createSession.cancel': '取消',
  'admin.createSession.creating': '建立中...',
  'admin.createSession.createSession': '建立會議',
  
  // Session Card
  'admin.sessionCard.status.active': '進行中',
  'admin.sessionCard.status.ended': '已結束',
  'admin.sessionCard.status.archived': '已歸檔',
  'admin.sessionCard.raceMode': '競速模式',
  'admin.sessionCard.updating': '更新中...',
  'admin.sessionCard.disableRaceMode': '❎️關閉賽車模式',
  'admin.sessionCard.enableRaceMode': '✅️開啟賽車模式',
  'admin.sessionCard.deleting': '刪除中...',
  'admin.sessionCard.deleteSession': '刪除會議',
  'admin.sessionCard.createdAt': '建立時間：',
  'admin.sessionCard.teams': '團隊：',
  'admin.sessionCard.participants': '參與者：',
  'admin.sessionCard.endedAt': '結束時間：',
  
  // Sessions List
  'admin.sessionsList.noSessions': '無會議',
  'admin.sessionsList.createNewSession': '建立新會議開始。',
  
  // Team Config Form
  'admin.teamConfig.title': '團隊配置',
  'admin.teamConfig.addTeam': '+ 新增團隊',
  'admin.teamConfig.noTeamsMessage': '尚未配置團隊。點擊「新增團隊」開始。',
  'admin.teamConfig.teamNamePlaceholder': '團隊名稱',
  'admin.teamConfig.teamNameRequired': '請輸入團隊名稱',
  'admin.teamConfig.maxMembersRequired': '請輸入團隊人數上限',
  'admin.teamConfig.totalCapacity': '總參與者容量：',
  'admin.teamConfig.defaultTeamName': '團隊',
  
  // Layout Header
  'layout.header.currentSession': '目前會議：',
  'layout.header.adminPasswordPlaceholder': '管理員密碼',
  'layout.header.login': '登入',
  'layout.header.loading': '...',
  'layout.navigation.joinSession': '加入會議',
  'layout.navigation.teams': '團隊',
  'layout.navigation.results': '結果',
  'layout.errors.authFailed': '身份驗證失敗',
  'layout.errors.networkError': '網路錯誤。請重試。',
  
  // Validation Error Messages
  'validation.name.required': '姓名為必填項目',
  'validation.name.maxLength': '姓名不得超過50個字元',
  'validation.occupation.required': '職業為必填項目',
  'validation.occupation.maxLength': '職業不得超過100個字元',
  'validation.experience.negative': '工作經驗年數不能為負數',
  'validation.experience.maxValue': '工作經驗年數不得超過70年',
  'validation.skills.required': '每項技能不得超過30個字元',
  'validation.skills.maxLength': '每項技能不得超過30個字元',
  'validation.skills.minCount': '至少需要一項技能',
  'validation.skills.maxCount': '最多只能填寫5項技能',
  'validation.traits.required': '每項個性特質不得超過40個字元',
  'validation.traits.maxLength': '每項個性特質不得超過40個字元',
  'validation.traits.minCount': '至少需要一項個性特質',
  'validation.traits.maxCount': '最多只能填寫5項個性特質',
  'validation.teamName.required': '團隊名稱為必填項目',
  'validation.teamName.tooLong': '團隊名稱過長',
  'validation.sessionId.invalid': '無效的會議ID',
  'validation.teamId.invalid': '無效的團隊ID',
  'validation.applications.minCount': '至少需要一個申請',
  'validation.applications.maxCount': '申請數量過多（最多500個）',
  'validation.teams.minCount': '至少需要一個團隊',
  'validation.teams.maxCount': '團隊數量過多（最多100個）',
  'validation.teamIds.required': '必須提供團隊ID或會議ID',
  'validation.sessionCode.format': '會議代碼必須為6位大寫字母或數字',
  'validation.sessionName.required': '會議名稱為必填項目',
  'validation.sessionName.maxLength': '會議名稱過長',
  'validation.description.maxLength': '描述過長',
  'validation.creator.required': '建立者識別碼為必填項目',
  'validation.creator.maxLength': '建立者名稱過長',
  'validation.teamMembers.min': '最少需要2名成員',
  'validation.teamMembers.max': '最多10名成員',
  'validation.confirmEnd.required': '必須確認結束會議',
  'validation.sessionCodeOrId.required': '必須提供會議代碼或會議ID',
  'validation.general.failed': '驗證失敗',

  // Role names - Default mode
  'roles.default.captain': '隊長',
  'roles.default.designHead': '總設計師',
  'roles.default.engineer': '技師',
  'roles.default.tireandwheel': '輪胎經理',
  'roles.default.driver': '駕駛',
  'roles.default.safetyOfficer': '安全責任者',
  'roles.default.environmentalOfficer': '環境保護主任',
  'roles.default.logisticsManager': '推車經理 1',
  'roles.default.logisticsManager2': '推車經理 2',
  'roles.default.cheerleader': '啦啦隊',

  // Role names - Race mode
  'roles.race.driver': '駕駛',
  'roles.race.funnel': '漏斗',
  'roles.race.gas': '加油員 1',
  'roles.race.gas2': '加油員 2',
  'roles.race.pushcar': '推車 1',
  'roles.race.pushcar2': '推車 2',
  'roles.race.changeWheel': '輪胎技師 1',
  'roles.race.changeWheel2': '輪胎技師 2',
  'roles.race.changeWheel3': '輪胎技師 3',
  'roles.race.changeWheel4': '輪胎技師 4',

  // Role descriptions - Default mode
  'roles.descriptions.captain': '組織、領導團隊並做決策',
  'roles.descriptions.designHead': '負責賽車的設計',
  'roles.descriptions.engineer': '負責建造賽車，並指定誰建造哪些部分',
  'roles.descriptions.tireandwheel': '學習並教導其他團隊成員如何換輪胎',
  'roles.descriptions.driver': '知道如何快速駕駛。較輕的體重較佳',
  'roles.descriptions.safetyOfficer': '檢查團隊成員工作的安全性和賽車的製造品質。確保團隊成員遵守規則',
  'roles.descriptions.environmentalOfficer': '回收並確保所有東西都放回原來的盒子裡',
  'roles.descriptions.logisticsManager': '推動賽車並將其移動到不同位置',
  'roles.descriptions.logisticsManager2': '推動賽車並將其移動到不同位置',
  'roles.descriptions.cheerleader': '建立團隊士氣',

  // Role descriptions - Race mode
  'roles.descriptions.funnel': '管理燃料流量和比賽期間的加油操作',
  'roles.descriptions.gas': '主要燃料處理員，負責快速安全的加油',
  'roles.descriptions.gas2': '輔助燃料處理員，協助加油操作',
  'roles.descriptions.pushcar': '協助在進站期間推動和定位賽車',
  'roles.descriptions.pushcar2': '協助在進站期間推動和定位賽車',
  'roles.descriptions.changeWheel': '主要換輪員，負責前輪',
  'roles.descriptions.changeWheel2': '次要換輪員，負責前輪',
  'roles.descriptions.changeWheel3': '主要換輪員，負責後輪',
  'roles.descriptions.changeWheel4': '次要換輪員，負責後輪',
};