'use client';

import { useState } from 'react';
import CreateSessionModal from './CreateSessionModal';
import SessionsList from './SessionsList';
import { useSessions } from '../../lib/hooks/useSessions';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { getTotalCapacity, formatTeamSummary } from '../../lib/admin/sessionHelpers';

interface CreateSessionForm {
  name: string;
  description: string;
  sessionCode: string;
  teams: Array<{ name: string; maxMembers: number }>;
  raceMode: boolean;
}

export default function AdminDashboard() {
  const {
    sessions,
    actionLoading,
    error,
    maintenanceLoading,
    maintenanceResult,
    createSession,
    endSession,
    toggleRaceMode,
    ensureAllJustifications,
  } = useSessions();

  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSessionForm>({
    name: '',
    description: '',
    sessionCode: '',
    teams: [],
    raceMode: false,
  });

  const logout = () => {
    localStorage.removeItem('adminAccess');
    window.location.href = '/';
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createSession(createForm);
    if (result.success) {
      setShowCreateForm(false);
      setCreateForm({ name: '', description: '', sessionCode: '', teams: [], raceMode: false });

      const totalCapacity = getTotalCapacity(createForm.teams);
      const teamSummary = formatTeamSummary(createForm.teams);
      alert(`✅ ${t('admin.dashboard.sessionCreated')}\n${t('admin.dashboard.sessionCode')}${result.code}\n\n${t('admin.dashboard.teams')}${teamSummary}\n${t('admin.dashboard.totalCapacity')}${totalCapacity} ${t('admin.dashboard.participants')}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
          <div className="flex gap-4">
            <button
              onClick={ensureAllJustifications}
              disabled={maintenanceLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              {maintenanceLoading ? t('admin.dashboard.processing') : t('admin.dashboard.systemMaintenance')}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {t('admin.dashboard.createNewSession')}
            </button>
            <button
              onClick={logout}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              {t('admin.dashboard.logout')}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <span>❌</span>
              {error}
            </div>
          </div>
        )}
        {maintenanceResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <span>✅</span>
              {maintenanceResult}
            </div>
          </div>
        )}

        {showCreateForm && (
          <CreateSessionModal
            form={createForm}
            setForm={setCreateForm}
            onClose={() => setShowCreateForm(false)}
            onSubmit={handleCreateSubmit}
            isSubmitting={actionLoading === 'create'}
          />
        )}

        <SessionsList
          sessions={sessions}
          actionLoading={actionLoading}
          onEndSession={endSession}
          onToggleRaceMode={toggleRaceMode}
        />
      </div>
    </div>
  );
}
