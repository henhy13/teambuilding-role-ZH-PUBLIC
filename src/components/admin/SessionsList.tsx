'use client';

import { Session } from '../../types';
import SessionCard from './SessionCard';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface Props {
  sessions: Session[];
  actionLoading: string | null;
  onEndSession: (sessionId: string) => void;
  onToggleRaceMode: (sessionId: string, raceMode: boolean) => void;
}

export default function SessionsList({
  sessions,
  actionLoading,
  onEndSession,
  onToggleRaceMode,
}: Props) {
  const { t } = useTranslation();
  
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.sessionsList.noSessions')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('admin.sessionsList.createNewSession')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onEndSession={onEndSession}
          onToggleRaceMode={onToggleRaceMode}
          actionLoading={actionLoading}
        />
      ))}
    </div>
  );
}
