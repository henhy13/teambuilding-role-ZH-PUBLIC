'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Team, Session, Applicant } from '../../types';
import SafeDate from '../../components/SafeDate';
import { useRequireSession } from '../../lib/hooks/useSessionGuards';
import { useMultipleAssignmentStatus } from '../../lib/hooks/useAssignmentStatus';
import { useErrorHandler } from '../../lib/hooks/useErrorHandler';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { ErrorBoundary, LoadingErrorFallback } from '../../components/ErrorBoundary';
import Logger from '@/lib/utils/logger';

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

export default function ResultsPage() {
  const { isReady, session: currentSession, sessionId } = useRequireSession();
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const { fetchWithErrorHandling, isLoading, error } = useErrorHandler();
  const { t } = useTranslation();
  const router = useRouter();
  const isLoadingRef = useRef(false);
  
  // Memoize team IDs to prevent unnecessary re-renders
  const teamIds = useMemo(() => teams.map(team => team.id), [teams]);
  const { assignmentState, isPolling, startPolling, stopPolling } = useMultipleAssignmentStatus(teamIds);

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

  // Optimized team loading function - now uses bulk endpoint
  const loadTeams = useCallback(async (sessionId: string) => {
    // Prevent duplicate calls
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      // Single API call to get all teams with assignment data
      const teamsData = await fetchWithErrorHandling(
        `/api/teams?sessionId=${sessionId}&includeAssignments=true`,
        undefined,
        'load teams with assignments'
      );
      
      if (!teamsData?.data) return;

      const processedTeams: TeamWithStats[] = teamsData.data;
      
      // Ensure teams are displayed in creation order (same as join page)
      processedTeams.sort((a: TeamWithStats, b: TeamWithStats) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
      
      setTeams(processedTeams);
      
      // Start polling only if needed
      const hasProcessingTeams = processedTeams.some(team => 
        team.processingStatus && team.processingStatus !== 'complete'
      );
      
      if (hasProcessingTeams) {
        startPolling();
      } else {
        stopPolling();
      }

    } catch (error) {
      Logger.error(`Error loading teams: ${error}`, 'ResultsPage');
      
      // Fallback: try loading teams without assignment data if bulk fails
      try {
        const basicTeamsData = await fetchWithErrorHandling(
          `/api/teams?sessionId=${sessionId}`,
          undefined,
          'load teams (fallback)'
        );
        
        if (basicTeamsData?.data) {
          const basicTeams = basicTeamsData.data.map((team: Team) => ({
            ...team,
            stats: {
              totalApplicants: team.applicants?.length || 0,
              isComplete: team.isComplete,
              skills: [...new Set((team.applicants || []).flatMap(a => a.skills || []))],
              occupations: [...new Set((team.applicants || []).map(a => a.occupation).filter(Boolean))]
            },
            applicants: team.applicants || []
          }));
          
          setTeams(basicTeams);
        }
      } catch (fallbackError) {
        Logger.error(`Fallback loading also failed: ${fallbackError}`, 'ResultsPage');
      }
    } finally {
      // Reset loading flag
      isLoadingRef.current = false;
    }
  }, [fetchWithErrorHandling, startPolling, stopPolling]);

  // Load teams when session is ready - simplified to prevent infinite loops
  useEffect(() => {
    if (isReady && sessionId) {
      loadTeams(sessionId);
    }
  }, [isReady, sessionId]); // Removed loadTeams from dependencies to prevent loop



  if (!isReady) {
    return <div>{t('results.loading')}</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-16 sm:w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">{t('results.loadingTeams')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <p className="text-lg font-semibold">{t('results.loadingFailed')}</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('results.reload')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={LoadingErrorFallback}>
      <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{t('results.pageTitle')}</h1>
          {currentSession && (
            <div className="text-gray-600">
              <p className="text-base sm:text-lg font-medium">{currentSession.name}</p>
              <p className="text-sm">{t('results.sessionCode')} <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentSession.settings.sessionCode}</span></p>
            </div>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <p className="text-gray-500 text-base sm:text-lg">{t('results.emptyState.title')}</p>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">{t('results.emptyState.description')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {teams.map((team) => {
              return (
                <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Team Header */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-2">{team.name}</h2>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-indigo-100">
                      <span className="text-sm sm:text-base mb-2 sm:mb-0">{team.applicants.length} / {team.maxMembers} {t('results.team.members')}</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${team.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}>
                        {team.isComplete ? t('results.team.completed') : t('results.team.inProgress')}
                      </span>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="p-4 sm:p-6">
                    {/* Show processing status if assignments are being generated (but not when complete) */}
                    {team.processingStatus && team.processingStatus !== 'complete' && (
                      <div className={`mb-4 p-3 rounded-lg ${
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
                          <span className={`text-sm font-medium ${
                            team.processingStatus === 'error' ? 'text-red-800' : 'text-blue-800'
                          }`}>
                            {team.processingMessage}
                          </span>
                          {isPolling && (
                            <span className="ml-2 text-xs text-blue-600">{t('results.team.autoUpdating')}</span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${
                          team.processingStatus === 'error' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {t('results.team.status')} {translateStatus(team.processingStatus)} {team.processingStatus === 'error' ? t('results.team.contactAdmin') : t('results.team.refreshLater')}
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-4">
                      <Link
                        href={`/results/${team.id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t('results.team.viewRoles')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Section */}
        {teams.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('results.summary.title')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{teams.length}</div>
                <div className="text-xs sm:text-sm text-blue-800">{t('results.summary.totalTeams')}</div>
              </div>
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {teams.reduce((sum, team) => sum + team.applicants.length, 0)}
                </div>
                <div className="text-xs sm:text-sm text-green-800">{t('results.summary.totalParticipants')}</div>
              </div>
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">
                  {teams.filter(team => team.isComplete).length}
                </div>
                <div className="text-xs sm:text-sm text-purple-800">{t('results.summary.completedTeams')}</div>
              </div>
              <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {teams.reduce((sum, team) => sum + team.applicants.filter(a => a.assignedRole).length, 0)}
                </div>
                <div className="text-xs sm:text-sm text-orange-800">{t('results.summary.assignedRoles')}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}
