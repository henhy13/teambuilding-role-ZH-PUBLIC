'use client';

import { Session } from '../../types';
import SafeDate from '../../components/SafeDate';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface Props {
  session: Session;
  actionLoading: string | null;
  onEndSession: (id: string) => void;
  onToggleRaceMode: (id: string, mode: boolean) => void;
}

export default function SessionCard({
  session,
  actionLoading,
  onEndSession,
  onToggleRaceMode,
}: Props) {
  const { t } = useTranslation();
  const isActive = session.status === 'active';
  const loadingKey = actionLoading === `race-${session.id}` || actionLoading === `end-${session.id}`;

  const badgeClass = {
    active: 'bg-green-100 text-green-800',
    ended: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  }[session.status];

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 mb-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            session.status === 'active' 
              ? 'bg-green-500 text-white' 
              : session.status === 'ended'
              ? 'bg-red-500 text-white'
              : 'bg-gray-500 text-white'
          }`}>
            {session.status === 'active' ? t('admin.sessionCard.status.active') : session.status === 'ended' ? t('admin.sessionCard.status.ended') : t('admin.sessionCard.status.archived')}
          </span>
          <div className="ml-4">
            <div className="flex items-center gap-3">
              <p className="text-lg font-medium text-gray-900">{session.name}</p>
              <span className="px-2 py-1 text-sm font-mono font-bold bg-blue-200 text-blue-900 rounded border border-blue-300">
                {session.settings?.sessionCode || 'N/A'}
              </span>
              {session.settings?.raceMode && (
                <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-200 text-orange-900 border border-orange-300">
                  {t('admin.sessionCard.raceMode')}
                </span>
              )}
            </div>
            {session.description && (
              <p className="text-sm text-gray-600 mt-1">{session.description}</p>
            )}
          </div>
        </div>

        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => onToggleRaceMode(session.id, !session.settings?.raceMode)}
              disabled={actionLoading === `race-${session.id}`}
              className={`px-3 py-2 text-sm rounded-md ${
                session.settings?.raceMode
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              {actionLoading === `race-${session.id}`
                ? t('admin.sessionCard.updating')
                : session.settings?.raceMode
                ? t('admin.sessionCard.disableRaceMode')
                : t('admin.sessionCard.enableRaceMode')}
            </button>
            <button
              onClick={() => onEndSession(session.id)}
              disabled={actionLoading === `end-${session.id}`}
              className="px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              {actionLoading === `end-${session.id}` ? t('admin.sessionCard.deleting') : t('admin.sessionCard.deleteSession')}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-600 space-x-6">
        <span>{t('admin.sessionCard.createdAt')}<SafeDate date={session.createdAt} format="localeDate" /></span>
        <span>{t('admin.sessionCard.teams')}<strong className="text-gray-800">{session.stats?.totalTeams || 0}</strong></span>
        <span>{t('admin.sessionCard.participants')}<strong className="text-gray-800">{session.stats?.totalApplicants || 0}</strong></span>
      </div>

      {session.endedAt && (
        <div className="mt-2 text-sm text-gray-600">
          {t('admin.sessionCard.endedAt')}<SafeDate date={session.endedAt} />
        </div>
      )}
    </div>
  );
}
