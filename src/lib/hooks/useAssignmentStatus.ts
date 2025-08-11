'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession, useAssignmentState } from '../context/SessionContext';
import Logger from '../utils/logger';

interface UseAssignmentStatusOptions {
  teamId: string;
  enabled?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
  onStatusChange?: (status: string) => void;
}

/**
 * Hook that manages assignment status polling for a team
 */
export function useAssignmentStatus({
  teamId,
  enabled = true,
  pollingInterval = 5000,
  maxRetries = 12, // 1 minute with 5s intervals
  onStatusChange,
}: UseAssignmentStatusOptions) {
  const { updateAssignmentStatus } = useSession();
  const assignmentState = useAssignmentState();
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isPollingRef = useRef(false);

  // Stop polling - using ref to ensure stability
  const stopPollingRef = useRef<() => void>(() => {});
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
    retryCountRef.current = 0;
  }, []);
  
  stopPollingRef.current = stopPolling;

  // Start polling - using ref to ensure stability
  const startPollingRef = useRef<() => void>(() => {});
  const startPolling = useCallback(() => {
    if (!enabled || !teamId || isPollingRef.current) return;

    isPollingRef.current = true;
    retryCountRef.current = 0;

    const poll = async () => {
      try {
        await updateAssignmentStatus(teamId);
        retryCountRef.current++;

        // Stop polling if max retries reached or assignment is completed
        // Check current state instead of depending on it
        const currentStatus = assignmentState.assignmentStatus;
        if (
          retryCountRef.current >= maxRetries ||
          currentStatus === 'completed' ||
          currentStatus === 'error'
        ) {
          stopPollingRef.current?.();
        }
      } catch (error) {
        Logger.error(`Polling error: ${error}`, 'useAssignmentStatus');
        retryCountRef.current++;
        
        if (retryCountRef.current >= maxRetries) {
          stopPollingRef.current?.();
        }
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [enabled, teamId, pollingInterval, maxRetries]); // Removed updateAssignmentStatus to prevent stale closures
  
  startPollingRef.current = startPolling;

  // Cleanup on unmount or dependency change
  useEffect(() => {
    return () => {
      // Ensure cleanup happens even if stopPolling reference changes
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isPollingRef.current = false;
      retryCountRef.current = 0;
    };
  }, [teamId]); // Cleanup when teamId changes

  // Trigger assignment for a team
  const triggerAssignment = useCallback(async (targetTeamId: string) => {
    try {
      const response = await fetch('/api/assignTeam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: targetTeamId }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Start polling after triggering assignment
        if (targetTeamId === teamId) {
          startPollingRef.current?.();
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
              Logger.error(`Error triggering assignment: ${error}`, 'useAssignmentStatus');
      return { success: false, error: '觸發分配失敗' };
    }
  }, [teamId]);

  // Store onStatusChange in ref to avoid dependency issues
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // Effect to handle status changes
  useEffect(() => {
    if (onStatusChangeRef.current && assignmentState.assignmentStatus) {
      onStatusChangeRef.current(assignmentState.assignmentStatus);
    }
  }, [assignmentState.assignmentStatus]);

  // Effect to start/stop polling based on assignment status
  useEffect(() => {
    if (!enabled || !teamId) {
      stopPolling();
      return;
    }

    // Start polling if assignment is processing
    if (assignmentState.assignmentStatus === 'processing') {
      startPollingRef.current?.();
    } else if (
      assignmentState.assignmentStatus === 'completed' ||
      assignmentState.assignmentStatus === 'error'
    ) {
      stopPollingRef.current?.();
    }

    return () => {
      stopPollingRef.current?.();
    };
  }, [enabled, teamId, assignmentState.assignmentStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPollingRef.current?.();
    };
  }, []);

  return {
    assignmentState,
    isPolling: isPollingRef.current,
    retryCount: retryCountRef.current,
    maxRetries,
    startPolling,
    stopPolling,
    triggerAssignment,
    refreshStatus: () => teamId ? updateAssignmentStatus(teamId) : Promise.resolve(),
  };
}

/**
 * Hook for managing multiple team assignments (used in results page)
 */
export function useMultipleAssignmentStatus(teamIds: string[]) {
  const { updateAssignmentStatus } = useSession();
  const assignmentState = useAssignmentState();
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const startPolling = useCallback(() => {
    if (teamIds.length === 0 || isPollingRef.current) return;

    isPollingRef.current = true;

    const pollAllTeams = async () => {
      try {
        // Update status for all teams
        await Promise.all(
          teamIds.map(teamId => updateAssignmentStatus(teamId))
        );
      } catch (error) {
        Logger.error(`Multi-team polling error: ${error}`, 'useAssignmentStatus');
      }
    };

    // Initial poll
    pollAllTeams();

    // Set up interval
    pollingIntervalRef.current = setInterval(pollAllTeams, 5000);
  }, [teamIds, updateAssignmentStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    assignmentState,
    isPolling: isPollingRef.current,
    startPolling,
    stopPolling,
    refreshAllStatuses: () => {
      teamIds.forEach(teamId => updateAssignmentStatus(teamId));
    },
  };
}