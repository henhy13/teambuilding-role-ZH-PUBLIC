'use client';

import { useEffect, useState } from 'react';
import { Session } from '../../types';

interface CreateSessionForm {
  name: string;
  description: string;
  sessionCode: string;
  teams: Array<{ name: string; maxMembers: number }>;
  raceMode: boolean;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.data);
        setError(null);
      } else {
        setError(data.error || '載入會議失敗');
      }
    } catch {
      setError('載入會議時發生網路錯誤');
    }
  };

  const createSession = async (form: CreateSessionForm) => {
    setActionLoading('create');

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          createdBy: 'Admin',
          settings: {
            maxApplicantsPerTeam: Math.max(...form.teams.map(t => t.maxMembers), 10),
            sessionCode: form.sessionCode || undefined,
            allowSelfRegistration: true,
            raceMode: form.raceMode,
          },
          teamConfigs: form.teams,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchSessions();
        return { success: true, code: data.data.settings.sessionCode };
      } else {
        setError(data.error || '建立會議失敗');
        return { success: false };
      }
    } catch {
      setError('建立會議時發生網路錯誤');
      return { success: false };
    } finally {
      setActionLoading(null);
    }
  };

  const endSession = async (id: string) => {
    const confirmEnd = window.confirm('您確定要刪除此會議？此操作無法還原！');
    if (!confirmEnd) return;

    setActionLoading(`end-${id}`);

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        await fetchSessions();
      } else {
        setError(data.error || '刪除會議失敗');
      }
    } catch {
      setError('刪除會議時發生錯誤');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRaceMode = async (id: string, raceMode: boolean) => {
    setActionLoading(`race-${id}`);

    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, settings: { raceMode } }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchSessions();
      } else {
        setError(data.error || '切換賽車模式失敗');
      }
    } catch {
      setError('切換賽車模式時發生錯誤');
    } finally {
      setActionLoading(null);
    }
  };

  const ensureAllJustifications = async () => {
    setMaintenanceLoading(true);
    setMaintenanceResult(null);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/ensureAllJustifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        const { justificationsGenerated, errors, totalTeams, completeTeams } = data.data;
        setMaintenanceResult(
          `✅ 補齊 ${justificationsGenerated} 個理由，錯誤 ${errors} 筆，處理 ${completeTeams}/${totalTeams} 團隊`
        );
      } else {
        setError(data.error || '補齊失敗');
      }
    } catch {
      setError('補齊過程中發生錯誤');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  return {
    sessions,
    actionLoading,
    error,
    maintenanceLoading,
    maintenanceResult,
    fetchSessions,
    createSession,
    endSession,
    toggleRaceMode,
    ensureAllJustifications,
  };
}
