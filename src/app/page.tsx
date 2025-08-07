'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/context/SessionContext';
import { useFormSubmission } from '../lib/hooks/useErrorHandler';
import { useTranslation } from '../lib/hooks/useTranslation';
import { Session } from '../types';

export default function HomePage() {
  const [sessionCode, setSessionCode] = useState('');
  const { initializeSession } = useSession();
  const { submitForm, isSubmitting, error, clearError } = useFormSubmission<Session>();
  const { t } = useTranslation();
  const router = useRouter();

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCode.trim()) {
      return;
    }

    clearError();

    const result = await submitForm(
      async () => {
        const response = await fetch('/api/sessions/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionCode: sessionCode.toUpperCase() }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || t('validation.invalidSessionCode'));
        }

        return data.data;
      },
      {
        onSuccess: (sessionData) => {
          // Store session data in sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentSession', JSON.stringify(sessionData));
          }
          initializeSession();
          router.push('/teams');
        },
        context: 'join session',
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            {t('home.title.teamRole')}
            <span className="text-blue-600"> {t('home.title.assignment')}</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Session Code Input */}
        <div className="mt-12 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{t('home.joinMeeting')}</h2>
            
            <form onSubmit={handleJoinSession} className="space-y-6">
              <div>
                <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.sessionCode')}
                </label>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                  placeholder={t('home.sessionCodePlaceholder')}
                  maxLength={6}
                  pattern="[A-Z0-9]{6}"
                  required
                  onInvalid={(e) => {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    if (target.validity.valueMissing) {
                      target.setCustomValidity(t('validation.sessionCodeRequired'));
                    } else if (target.validity.patternMismatch) {
                      target.setCustomValidity(t('validation.sessionCodeFormat'));
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.setCustomValidity('');
                  }}
                />
                <p className="mt-2 text-sm text-gray-500 text-center">
                  {t('home.sessionCodeDescription')}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !sessionCode.trim()}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('home.joiningButton')}
                  </div>
                ) : (
                  t('home.joinButton')
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}