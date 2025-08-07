'use client';

import React from 'react';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface Team {
  name: string;
  maxMembers: number;
}

interface Props {
  form: {
    teams: Team[];
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export default function TeamConfigForm({ form, setForm }: Props) {
  const { t } = useTranslation();
  
  const addTeam = () => {
    setForm((prev: any) => ({
      ...prev,
      teams: [...prev.teams, { name: `${t('admin.teamConfig.defaultTeamName')} ${prev.teams.length + 1}`, maxMembers: 10 }],
    }));
  };

  const removeTeam = (index: number) => {
    setForm((prev: any) => ({
  ...prev,
  teams: prev.teams.filter((_: Team, i: number) => i !== index),
    }));
  };

  const updateTeam = (index: number, field: 'name' | 'maxMembers', value: string | number) => {
    const updated = form.teams.map((team, i) =>
      i === index ? { ...team, [field]: value } : team
    );
    setForm((prev: any) => ({ ...prev, teams: updated }));
  };

  const totalCapacity = form.teams.reduce((sum, team) => sum + team.maxMembers, 0);

  return (
    <div className="border-t pt-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-medium text-gray-900">{t('admin.teamConfig.title')}</h4>
        <button
          type="button"
          onClick={addTeam}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          {t('admin.teamConfig.addTeam')}
        </button>
      </div>

      {form.teams.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">{t('admin.teamConfig.noTeamsMessage')}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {form.teams.map((team, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => updateTeam(index, 'name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin.teamConfig.teamNamePlaceholder')}
                  required
                  onInvalid={(e) => {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    if (target.validity.valueMissing) {
                      target.setCustomValidity(t('admin.teamConfig.teamNameRequired'));
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.setCustomValidity('');
                  }}
                />
              </div>

              <div className="w-24">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="2"
                  max="10"
                  value={team.maxMembers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) updateTeam(index, 'maxMembers', value);
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 2;
                    if (value < 2) updateTeam(index, 'maxMembers', 2);
                    else if (value > 10) updateTeam(index, 'maxMembers', 10);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  onInvalid={(e) => {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    if (target.validity.valueMissing) {
                      target.setCustomValidity(t('admin.teamConfig.maxMembersRequired'));
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.setCustomValidity('');
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => removeTeam(index)}
                className="text-red-600 hover:text-red-800 p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-sm text-gray-600">
        <p>
          {t('admin.teamConfig.totalCapacity')}
          <strong>{totalCapacity}</strong>
        </p>
      </div>
    </div>
  );
}
