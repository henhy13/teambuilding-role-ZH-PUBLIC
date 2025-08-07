'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, useSessionState } from '../context/SessionContext';
import { Team } from '../../types';
import Logger from '../utils/logger';

/**
 * Hook that ensures a valid session exists, redirects to home if not
 */
export function useRequireSession() {
  const { mounted, sessionId, currentSession, sessionStatus } = useSessionState();
  const { clearSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!mounted) return;

    if (!sessionId || !currentSession) {
      router.push('/');
      return;
    }

    // Check if session is still valid
    if (sessionStatus === 'ended' || sessionStatus === 'error') {
      clearSession();
      return;
    }
  }, [mounted, sessionId, currentSession, sessionStatus, router, clearSession]);

  return {
    isReady: mounted && !!sessionId && !!currentSession && sessionStatus !== 'error',
    session: currentSession,
    sessionId,
  };
}

/**
 * Hook that validates team access and loads team data
 */
export function useTeamGuard(teamId: string) {
  const { isReady, session, sessionId } = useRequireSession();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !teamId) return;

    // Validate that team belongs to current session
    const validateTeam = async () => {
      try {
        const response = await fetch(`/api/teams?sessionId=${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          const teamExists = data.data.some((team: Team) => team.id === teamId);
          if (!teamExists) {
            Logger.error('Team not found in current session', 'useRequireTeamAccess');
            router.push('/teams');
          }
        } else {
          Logger.error('Failed to validate team access', 'useRequireTeamAccess');
          router.push('/teams');
        }
      } catch (error) {
        Logger.error(`Error validating team access: ${error}`, 'useRequireTeamAccess');
        router.push('/teams');
      }
    };

    validateTeam();
  }, [isReady, teamId, sessionId, router]);

  return {
    isReady: isReady && !!teamId,
    session,
    sessionId,
    teamId,
  };
}

/**
 * Hook for admin-only pages
 */
export function useRequireAdmin() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const adminSessionId = localStorage.getItem('adminSessionId');
    if (!adminSessionId) {
      router.push('/admin/login');
      return;
    }

    // Validate admin session
    const validateAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: adminSessionId }),
        });

        if (!response.ok) {
          localStorage.removeItem('adminSessionId');
          router.push('/admin/login');
        }
      } catch (error) {
        Logger.error(`Admin session validation failed: ${error}`, 'useRequireAdminAuth');
        localStorage.removeItem('adminSessionId');
        router.push('/admin/login');
      }
    };

    validateAdminSession();
  }, [router]);

  return {
    isAdmin: true,
  };
}