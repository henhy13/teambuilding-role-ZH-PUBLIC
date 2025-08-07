'use client';

import { useState } from 'react';
import TeamConfigForm from './TeamConfigForm';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface Team {
  name: string;
  maxMembers: number;
}

interface CreateSessionForm {
  name: string;
  description: string;
  sessionCode: string;
  teams: Team[];
  raceMode: boolean;
}

interface Props {
  form: CreateSessionForm;
  setForm: React.Dispatch<React.SetStateAction<CreateSessionForm>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

export default function CreateSessionModal({
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.createSession.title')}</h3>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('admin.createSession.sessionName')}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('admin.createSession.sessionNamePlaceholder')}
                onInvalid={(e) => {
                  e.preventDefault();
                  const target = e.target as HTMLInputElement;
                  if (target.validity.valueMissing) {
                    target.setCustomValidity(t('admin.createSession.sessionNameRequired'));
                  }
                }}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('admin.createSession.customSessionCode')}</label>
              <input
                type="text"
                value={form.sessionCode}
                onChange={(e) =>
                  setForm({ ...form, sessionCode: e.target.value.toUpperCase() })
                }
                placeholder={t('admin.createSession.customSessionCodePlaceholder')}
                maxLength={6}
                pattern="[A-Z0-9]{6}"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{t('admin.createSession.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder={t('admin.createSession.descriptionPlaceholder')}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 👉 TEAM CONFIGURATION */}
          <TeamConfigForm form={form} setForm={setForm} />

          {/* CTA Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('admin.createSession.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || form.teams.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? t('admin.createSession.creating') : t('admin.createSession.createSession')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
