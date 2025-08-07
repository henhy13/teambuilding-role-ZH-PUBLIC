'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Team, Session, Applicant } from '@/types';
import { ROLE_DESCRIPTIONS, DEFAULT_ROLES, getRoleForMode, getRolesForMode, getTranslatedRole, getTranslatedRoleDescription } from '@/lib/validation';
import { useRequireSession, useAssignmentStatus, useErrorHandler } from '@/lib/hooks';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { ErrorBoundary, AssignmentErrorFallback } from '@/components/ErrorBoundary';
import GoogleTranslateText from '@/components/GoogleTranslateText';

interface ApplicantWithAssignment extends Applicant {
  assignedRole?: string;
  justification?: string;
  compatibilityScore?: number;
}

interface TeamWithStats extends Omit<Team, 'applicants'> {
  applicants: ApplicantWithAssignment[];
  stats: {
    totalApplicants: number;
    isComplete: boolean;
    skills: string[];
    occupations: string[];
  };
  processingStatus?: string;
  processingMessage?: string;
}

export default function TeamDetailPage() {
  const { isReady, session: currentSession, sessionId } = useRequireSession();
  const [team, setTeam] = useState<TeamWithStats | null>(null);
  const [showJustification, setShowJustification] = useState<string | null>(null);
  const { fetchWithErrorHandling, isLoading, error } = useErrorHandler();
  const { t, language } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const teamId = params ? (params.teamId as string) : '';
  
  // Stable callback for status changes using useCallback
  const handleStatusChange = useCallback((status: string) => {
    setTeam(prev => prev ? {
      ...prev,
      processingStatus: status,
      processingMessage: status === 'justifying' ? t('teamDetails.processing.generatingAI') : 
                       status === 'complete' ? t('teamDetails.processing.completed') : t('teamDetails.processing.generating')
    } : null);
  }, [t]); // Added t as dependency

  // Use assignment status hook for polling
  const { assignmentState, isPolling, startPolling, stopPolling } = useAssignmentStatus({
    teamId,
    enabled: !!teamId && isReady,
    pollingInterval: 8000, // Reduced frequency: 8 seconds instead of 3
    maxRetries: 15, // 2 minutes at 8-second intervals
    onStatusChange: handleStatusChange
  });

  // Function to translate status values using translation system
  const translateStatus = (status: string): string => {
    const statusTranslations: { [key: string]: string } = {
      'pending': t('results.status.pending'),
      'scoring': t('results.status.scoring'),
      'assigning': t('results.status.assigning'),
      'justifying': t('results.status.justifying'),
      'complete': t('results.status.complete'),
      'error': t('results.status.error')
    };
    return statusTranslations[status] || status;
  };

  // Close justification popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showJustification && !(event.target as Element).closest('.justification-popup')) {
        setShowJustification(null);
      }
    };

    if (showJustification) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showJustification]);

  const loadTeamDetail = useCallback(async (sessionId: string, teamId: string) => {
    // First get the basic team info
    const teamsData = await fetchWithErrorHandling(
      `/api/teams?sessionId=${sessionId}`,
      undefined,
      'load teams'
    );
    
    if (!teamsData) return;

    const foundTeam = teamsData.data.find((t: Team) => t.id === teamId);
    if (!foundTeam) {
      throw new Error(t('teamDetails.error.teamNotFound'));
    }

    // Get detailed stats
    const statsData = await fetchWithErrorHandling(
      `/api/teams?teamId=${teamId}`,
      undefined,
      `load stats for team ${teamId}`
    );
    
    let teamWithStats = statsData ? statsData.data : { 
      ...foundTeam, 
      stats: { totalApplicants: 0, isComplete: false, skills: [], occupations: [] } 
    };

    // Fetch assignment data if team is complete
    if (foundTeam.isComplete) {
      const assignmentData = await fetchWithErrorHandling(
        `/api/getAssignments?teamId=${teamId}`,
        undefined,
        `load assignments for team ${teamId}`
      );
      
      if (assignmentData) {
        // Assignment data loaded successfully
        
        // Always set processing status based on session status
        if (assignmentData.data?.session?.status) {
          teamWithStats.processingStatus = assignmentData.data.session.status;
          if (assignmentData.data.session.status === 'justifying') {
            teamWithStats.processingMessage = t('teamDetails.processing.generatingAI');
          } else if (assignmentData.data.session.status === 'complete') {
            teamWithStats.processingMessage = assignmentData.message || t('teamDetails.processing.completed');
          } else {
            teamWithStats.processingMessage = assignmentData.message || t('teamDetails.processing.generating');
          }
        }
        
        if (assignmentData.data.assignmentDetails) {
          // Map assignment details to applicants
          const assignmentMap = new Map();
          assignmentData.data.assignmentDetails.forEach((detail: any) => {
            assignmentMap.set(detail.applicant.id, {
              assignedRole: detail.role.name,
              compatibilityScore: detail.score,
              justification: detail.justification
            });
          });

          // Add role assignments to applicants
          teamWithStats.applicants = teamWithStats.applicants.map((applicant: any) => {
            const assignment = assignmentMap.get(applicant.id);
            return {
              ...applicant,
              ...assignment
            };
          });
          
          // Check justification status
          const membersWithRoles = teamWithStats.applicants.filter((a: any) => a.assignedRole);
          const membersWithJustifications = membersWithRoles.filter((a: any) => a.justification);
          // Justification status checked
        }
      }
    }
    
    setTeam(teamWithStats);
  }, [fetchWithErrorHandling, t]);

  // Load team detail when session is ready
  useEffect(() => {
    if (isReady && sessionId && teamId) {
      loadTeamDetail(sessionId, teamId);
    }
  }, [isReady, sessionId, teamId, loadTeamDetail]);

  // Manage polling based on team processing status
  useEffect(() => {
    if (!team || !isReady) {
      stopPolling();
      return;
    }

    // Start polling if team is processing justifications
    const needsPolling = team.processingStatus === 'justifying';
    
    if (needsPolling) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [team?.processingStatus, isReady, startPolling, stopPolling]);

  const getColorForRole = (translatedRole: string, originalChineseRole?: string) => {
    // Map based on the original Chinese role (since that's consistent across languages)
    // but fall back to translated role for unknown roles
    const chineseToColorMap: { [key: string]: string } = {
      '隊長': 'bg-indigo-100 text-indigo-800',
      '總設計師': 'bg-blue-100 text-blue-800', 
      '技師': 'bg-emerald-100 text-emerald-800',
      '輪胎經理': 'bg-orange-100 text-orange-800',
      '駕駛': 'bg-red-100 text-red-800',
      '安全責任者': 'bg-yellow-100 text-yellow-800',
      '環境保護主任': 'bg-green-100 text-green-800',
      '推車經理 1': 'bg-purple-100 text-purple-800',
      '推車經理 2': 'bg-cyan-100 text-cyan-800',
      '啦啦隊': 'bg-pink-100 text-pink-800',
      // Race mode roles
      '漏斗': 'bg-indigo-100 text-indigo-800',
      '加油員 1': 'bg-yellow-100 text-yellow-800',
      '加油員 2': 'bg-green-100 text-green-800',
      '推車 1': 'bg-purple-100 text-purple-800',
      '推車 2': 'bg-cyan-100 text-cyan-800',
      '輪胎技師 1': 'bg-orange-100 text-orange-800',
      '輪胎技師 2': 'bg-blue-100 text-blue-800',
      '輪胎技師 3': 'bg-emerald-100 text-emerald-800',
      '輪胎技師 4': 'bg-pink-100 text-pink-800',
    };
    
    if (originalChineseRole && chineseToColorMap[originalChineseRole]) {
      return chineseToColorMap[originalChineseRole];
    }
    
    // Fallback to generic gray if no mapping found
    return 'bg-gray-100 text-gray-800';
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 font-bold';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  // Helper function to organize team members by role order
  const getTeamMembersByRoleOrder = () => {
    const membersByRole: { [role: string]: ApplicantWithAssignment } = {};
    const isRaceMode = currentSession?.settings?.raceMode || false;
    
    // Group members by their assigned role
    team?.applicants.forEach(applicant => {
      if (applicant.assignedRole) {
        membersByRole[applicant.assignedRole] = applicant;
      }
    });
    
    // Return members in the order defined by the role list
    // If in race mode, map original roles to race roles for display
    return DEFAULT_ROLES
      .filter(role => membersByRole[role]) // Only include roles that have been assigned
      .map(originalRole => {
        const displayRole = getRoleForMode(originalRole, isRaceMode);
        const translatedRole = getTranslatedRole(displayRole, isRaceMode, t);
        return {
          role: translatedRole,
          originalRole,
          chineseRole: displayRole, // Keep the Chinese role for color mapping
          member: membersByRole[originalRole]
        };
      });
  };

  if (!isReady) {
    return <div>{t('teamDetails.loading')}</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-base">{t('teamDetails.loadingTeamDetails')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <p className="text-lg font-semibold">{t('teamDetails.loadingFailed')}</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('teamDetails.reload')}
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">{t('teamDetails.teamNotFound')}</p>
          <Link href="/results" className="text-blue-600 hover:text-blue-700 text-base mt-2 inline-block">
            ← {t('teamDetails.backToResultsLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={AssignmentErrorFallback}>
      <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-0">
              {team.name} - {t('teamDetails.pageTitle')}
            </h1>
            <Link
              href="/results"
              className="inline-flex items-center text-sm sm:text-base text-blue-600 hover:text-blue-700"
            >
              ← {t('teamDetails.backToResults')}
            </Link>
          </div>
          
          {currentSession && (
            <div className="text-gray-600">
              <p className="text-base sm:text-lg font-medium">{currentSession.name}</p>
              <p className="text-sm">{t('teamDetails.sessionCode')} <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentSession.settings.sessionCode}</span></p>
            </div>
          )}
        </div>

        {/* Team Status */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 sm:p-6 rounded-lg mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold mb-2">{team.name}</h2>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-indigo-100">
            <span className="text-sm sm:text-base mb-2 sm:mb-0">{team.applicants.length} / {team.maxMembers} {t('teamDetails.status.members')}</span>
            <span className={`inline-block px-2 py-1 rounded-full text-xs ${team.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}>
              {team.isComplete ? t('teamDetails.status.completed') : t('teamDetails.status.inProgress')}
            </span>
          </div>
        </div>

        {/* Race Mode Indicator */}
        {currentSession?.settings?.raceMode && (
          <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-6 sm:mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>{t('teamDetails.raceMode.title')}</strong> {t('teamDetails.raceMode.description')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status (hide when complete) */}
        {team.processingStatus && team.processingStatus !== 'complete' && (
          <div className={`mb-6 sm:mb-8 p-3 sm:p-4 rounded-lg ${
            team.processingStatus === 'error' 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              {team.processingStatus === 'error' ? (
                <div className="h-4 w-4 mr-2">
                  <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              )}
              <span className={`text-sm sm:text-base font-medium ${
                team.processingStatus === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {team.processingMessage}
              </span>
              {isPolling && (
                <span className="ml-2 text-xs text-blue-600">{t('teamDetails.status.autoUpdating')}</span>
              )}
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${
              team.processingStatus === 'error' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {t('teamDetails.status.label')} {translateStatus(team.processingStatus)} {team.processingStatus === 'error' ? t('teamDetails.status.contactAdmin') : t('teamDetails.status.refreshLater')}
            </p>
          </div>
        )}
        
        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">{t('teamDetails.members.title')}</h3>
          
          {team.applicants.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-base">{t('teamDetails.members.noMembers')}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Show members with assigned roles first, in role order */}
              {getTeamMembersByRoleOrder().map(({ role, originalRole, chineseRole, member }) => (
                <div key={member.id} className="relative border rounded-lg p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                    <h4 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 sm:mb-0">{member.name}</h4>
                    {member.justification ? (
                       <span 
                         onClick={() => setShowJustification(showJustification === member.id ? null : member.id)}
                         className={`inline-block px-3 py-2 rounded-full text-sm sm:text-base font-medium cursor-pointer transition-all duration-300 animate-pulse ${getColorForRole(role, chineseRole)}`}
                         style={{
                           boxShadow: '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.1)',
                           animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                         }}
                       >
                         💡 {role}
                       </span>
                     ) : (
                      <span className={`inline-block px-3 py-2 rounded-full text-sm sm:text-base font-medium ${getColorForRole(role, chineseRole)}`}>
                        {role}
                      </span>
                    )}
                  </div>
                  
                  {chineseRole && (
                    <div className="text-xs sm:text-sm text-blue-700 bg-blue-50 p-3 rounded mb-3">
                      <strong>{t('teamDetails.members.roleResponsibility')}</strong> {getTranslatedRoleDescription(chineseRole, t)}
                    </div>
                  )}
                  
                  <div className="text-xs sm:text-sm text-gray-500 mb-3">
                    <strong>{t('teamDetails.members.occupation')}</strong> {member.occupation}
                  </div>
                  
                  {member.justification && showJustification === member.id && (
                      <div className="absolute top-0 right-0 z-50">
                        <div className="justification-popup relative mt-8 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-sm sm:max-w-md w-80 sm:w-96">
                          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                          <div className="text-xs sm:text-sm text-gray-700">
                            <strong className="text-blue-800">{t('teamDetails.members.whyThisRole')}</strong>
                            <GoogleTranslateText
                              chineseText={member.justification}
                              language={language}
                              uniqueId={`justification-${member.id}`}
                              className="mt-1 leading-relaxed"
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowJustification(null);
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  
                  {member.compatibilityScore !== undefined && member.compatibilityScore !== null && (
                    <div className="mb-3 text-xs sm:text-sm">
                      <span className="text-gray-500 font-bold">{t('teamDetails.members.teamCompatibility')} </span>
                      <span className={getCompatibilityColor(member.compatibilityScore)}>
                        {member.compatibilityScore}%
                      </span>
                    </div>
                  )}
                  
                  <div className="text-xs sm:text-sm text-gray-500">
                    <strong>{t('teamDetails.members.skills')}</strong> {member.skills.join(', ')}
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-500 mt-2">
                    <strong>{t('teamDetails.members.personality')}</strong> {member.personalityTraits.join(', ')}
                  </div>
                </div>
              ))}
              {/* Show members without assigned roles at the end */}
              {team.applicants
                .filter(applicant => !applicant.assignedRole)
                .map((applicant) => (
                  <div key={applicant.id} className="border rounded-lg p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                      <h4 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 sm:mb-0">{applicant.name}</h4>
                      <span className="inline-block px-3 py-2 rounded-full text-sm sm:text-base font-medium bg-gray-100 text-gray-700">
                        {t('teamDetails.members.unassignedRole')}
                      </span>
                    </div>
                    
                    <div className="text-xs sm:text-sm text-gray-500 mb-3">
                      <strong>{t('teamDetails.members.occupation')}</strong> {applicant.occupation}
                    </div>
                    
                    <div className="text-xs sm:text-sm text-gray-500">
                      <strong>{t('teamDetails.members.skills')}</strong> {applicant.skills.join(', ')}
                    </div>
                    
                    <div className="text-xs sm:text-sm text-gray-500 mt-2">
                      <strong>{t('teamDetails.members.personality')}</strong> {applicant.personalityTraits.join(', ')}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Team Overview */}
        {team.stats && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">{t('teamDetails.overview.title')}</h3>
            <div className="space-y-2">
              {getTeamMembersByRoleOrder().map(({ role, originalRole, chineseRole, member }) => (
                <div key={member.id} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200 shadow-sm">
                  <span className="text-slate-800 text-sm font-medium">
                    {member.name}
                  </span>
                  <span className={`text-base px-4 py-2 rounded-lg font-medium shadow-sm border ${getColorForRole(role, chineseRole)}`}>
                    {role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}