'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Team, Session } from '../../types';
import SafeDate from '../../components/SafeDate';
import { useRequireSession } from '../../lib/hooks/useSessionGuards';
import { useFormSubmission, useErrorHandler } from '../../lib/hooks/useErrorHandler';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { ErrorBoundary, LoadingErrorFallback } from '../../components/ErrorBoundary';

export default function TeamsPage() {
  const { isReady, session: currentSession, sessionId } = useRequireSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const { fetchWithErrorHandling, error: loadError } = useErrorHandler();
  const { submitForm, isSubmitting, error: submitError } = useFormSubmission();
  const { t } = useTranslation();
  const router = useRouter();

  const loadTeams = useCallback(async (sessionId: string) => {
    const data = await fetchWithErrorHandling(
      `/api/teams?sessionId=${sessionId}`,
      undefined,
      'load teams'
    );
    
    if (data) {
      // Ensure teams are in creation order
      const sortedTeams = (data.data || []).sort((a: Team, b: Team) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setTeams(sortedTeams);
    }
  }, [fetchWithErrorHandling]);

  // Load teams when session is ready
  useEffect(() => {
    if (isReady && sessionId) {
      loadTeams(sessionId);
    }
  }, [isReady, sessionId, loadTeams]);

  const [showJoinForm, setShowJoinForm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    occupation: '',
    yearsOfExperience: 0,
    experienceUnit: 'years' as 'years' | 'months',
    skills: [''],
    personalityTraits: ['']
  });

  const handleSkillChange = (index: number, value: string) => {
    // Limit to 30 字元
    if (value.length <= 30) {
      const newSkills = [...formData.skills];
      newSkills[index] = value;
      setFormData({ ...formData, skills: newSkills });
    }
  };

  const addSkill = () => {
    if (formData.skills.length < 5) {
      setFormData({ ...formData, skills: [...formData.skills, ''] });
    }
  };

  const removeSkill = (index: number) => {
    if (formData.skills.length > 1) {
      const newSkills = formData.skills.filter((_, i) => i !== index);
      setFormData({ ...formData, skills: newSkills });
    }
  };

  const handleTraitChange = (index: number, value: string) => {
    // Limit to 40 字元
    if (value.length <= 40) {
      const newTraits = [...formData.personalityTraits];
      newTraits[index] = value;
      setFormData({ ...formData, personalityTraits: newTraits });
    }
  };

  const addTrait = () => {
    if (formData.personalityTraits.length < 5) {
      setFormData({ ...formData, personalityTraits: [...formData.personalityTraits, ''] });
    }
  };

  const removeTrait = (index: number) => {
    if (formData.personalityTraits.length > 1) {
      const newTraits = formData.personalityTraits.filter((_, i) => i !== index);
      setFormData({ ...formData, personalityTraits: newTraits });
    }
  };

  const joinTeam = (teamId: string) => {
    setShowJoinForm(teamId);
    // Reset form data when opening join form
    setFormData({
      name: '',
      occupation: '',
      yearsOfExperience: 0,
      experienceUnit: 'years' as 'years' | 'months',
      skills: [''],
      personalityTraits: ['']
    });
  };

  const handleJoinSubmit = async (e: React.FormEvent, teamId: string) => {
    e.preventDefault();
    
    if (!currentSession || !sessionId) {
      return;
    }

    // Filter out empty skills and traits
    const cleanedSkills = formData.skills.filter(skill => skill.trim());
    const cleanedTraits = formData.personalityTraits.filter(trait => trait.trim());

    if (cleanedSkills.length === 0) {
      alert(t('teams.validation.skillsRequired'));
      return;
    }

    if (cleanedTraits.length === 0) {
      alert(t('teams.validation.traitsRequired'));
      return;
    }

    const result = await submitForm(
      async () => {
        const response = await fetch('/api/submitApplicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            teamId: teamId,
            applicant: {
              name: formData.name.trim(),
              occupation: formData.occupation.trim(),
              yearsOfExperience: formData.yearsOfExperience,
              experienceUnit: formData.experienceUnit,
              skills: cleanedSkills,
              personalityTraits: cleanedTraits
            }
          })
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || t('teams.validation.joinTeamFailed'));
        }

        return data;
      },
      {
        onSuccess: () => {
          setShowJoinForm(null);
          
          // Reset form
          setFormData({
            name: '',
            occupation: '',
            yearsOfExperience: 0,
            experienceUnit: 'years' as 'years' | 'months',
            skills: [''],
            personalityTraits: ['']
          });

          // Reload teams to show updated data
          loadTeams(sessionId);
        },
        context: 'join team',
      }
    );
  };

  // Show loading state
  if (!isReady || !currentSession) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">{t('teams.loading')}</div>
    </div>;
  }

  // Separate teams by completion status, maintaining creation order within each group
  const incompleteTeams = teams
    .filter(team => !team.isComplete)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const fullTeams = teams
    .filter(team => team.isComplete)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <ErrorBoundary fallback={LoadingErrorFallback}>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('teams.pageTitle')}</h1>
          {currentSession && (
            <div className="text-gray-600">
              <p className="text-lg font-medium">{currentSession.name}</p>
              <p className="text-sm">{t('teams.sessionCode')} <span className="font-mono bg-gray-100 px-2 py-1 rounded">{currentSession.settings.sessionCode}</span></p>
            </div>
          )}
        </div>

        {/* Status Message */}
        {(loadError || submitError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{loadError || submitError}</p>
          </div>
        )}





        {/* Empty state */}
        {teams.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">{t('teams.emptyState.title')}</p>
            <p className="text-gray-400 mt-2">{t('teams.emptyState.description')}</p>
          </div>
        )}

        {/* Incomplete Teams */}
        {incompleteTeams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('teams.openTeams.title')}</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {incompleteTeams.map((team) => (
                <div key={team.id} className="bg-white shadow sm:rounded-lg border-l-4 border-green-400">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('teams.status.open')} ({team.applicants.length}/{team.maxMembers})
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <p><strong>{t('teams.status.label')}</strong>{t('teams.status.accepting')}</p>
                        <p><strong>{t('teams.capacity')}</strong> {team.applicants.length} / {team.maxMembers} {t('teams.capacity.members')}</p>
                      </div>

                      <div className="text-sm">
                        <strong className="text-gray-700">{t('teams.currentMembers')}</strong>
                        {team.applicants.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {team.applicants.slice(0, 3).map((applicant, index) => (
                              <div key={applicant.id} className="text-gray-600">
                                • {applicant.name} ({applicant.occupation})
                              </div>
                            ))}
                            {team.applicants.length > 3 && (
                              <div className="text-gray-500 italic">
                                {t('teams.morePrefix')} {team.applicants.length - 3} {t('teams.moreMembers')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 ml-2">{t('teams.noMembers')}</span>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => joinTeam(team.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {isSubmitting ? t('teams.joining') : t('teams.joinTeam')}
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Teams */}
        {fullTeams.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('teams.completedTeams.title')}</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {fullTeams.map((team) => (
                <div key={team.id} className="bg-white shadow sm:rounded-lg border-l-4 border-blue-400">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t('teams.status.full')} ({team.maxMembers}/{team.maxMembers})
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <p><strong>{t('teams.status.label')}</strong>{t('teams.status.readyForAssignment')}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => router.push('/results')}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {t('teams.viewResults')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Team Form Modal */}
        {showJoinForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-2xl bg-white shadow-lg rounded-md max-h-[95vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {t('teams.joinForm.title')} {teams.find(t => t.id === showJoinForm)?.name}
                  </h3>
                  <button
                    onClick={() => setShowJoinForm(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={(e) => handleJoinSubmit(e, showJoinForm)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">{t('teams.joinForm.personalInfo')}</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('teams.joinForm.fullName')}
                        <span className="text-xs text-gray-500 ml-2">
                          {formData.name.length}/50 {t('teams.joinForm.characters')}
                        </span>
                      </label>
                      <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => {
                                if (e.target.value.length <= 50) {
                                  setFormData({ ...formData, name: e.target.value });
                                }
                              }}
                              className="mt-1 block w-full rounded-md border border-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-3 text-base"
                              placeholder={t('teams.joinForm.fullNamePlaceholder')}
                              maxLength={50}
                              required
                              onInvalid={(e) => {
                                e.preventDefault();
                                const target = e.target as HTMLInputElement;
                                if (target.validity.valueMissing) {
                                  target.setCustomValidity(t('teams.validation.fullNameRequired'));
                                }
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLInputElement;
                                target.setCustomValidity('');
                              }}
                            />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('teams.joinForm.occupation')}
                        <span className="text-xs text-gray-500 ml-2">
                              {formData.occupation.length}/100 {t('teams.joinForm.characters')}
                            </span>
                      </label>
                      <input
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => {
                          if (e.target.value.length <= 100) {
                            setFormData({ ...formData, occupation: e.target.value });
                          }
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-3 text-base"
                        placeholder={t('teams.joinForm.occupationPlaceholder')}
                        maxLength={100}
                        required
                        onInvalid={(e) => {
                          e.preventDefault();
                          const target = e.target as HTMLInputElement;
                          if (target.validity.valueMissing) {
                            target.setCustomValidity(t('teams.validation.occupationRequired'));
                          }
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.setCustomValidity('');
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('teams.joinForm.experience')}
                      </label>
                      <div className="mt-1 flex gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max={formData.experienceUnit === 'years' ? "70" : "11"}
                            value={formData.yearsOfExperience === 0 ? '' : formData.yearsOfExperience}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              
                              // Allow empty string for clearing
                              if (inputValue === '') {
                                setFormData({ ...formData, yearsOfExperience: 0 });
                                return;
                              }
                              
                              // Parse the value
                              const value = parseInt(inputValue);
                              
                              // Allow any numeric input during typing, validate on blur
                              if (!isNaN(value)) {
                                setFormData({ ...formData, yearsOfExperience: value });
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const maxValue = formData.experienceUnit === 'years' ? 70 : 11;
                              
                              // Validate and correct on blur
                              if (value < 1) {
                                setFormData({ ...formData, yearsOfExperience: 1 });
                              } else if (value > maxValue) {
                                setFormData({ ...formData, yearsOfExperience: maxValue });
                              }
                            }}
                            className="block w-full rounded-md border border-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-3 text-base"
                            placeholder={formData.experienceUnit === 'years' ? "1-70" : "1-11"}
                            required
                            onInvalid={(e) => {
                              e.preventDefault();
                              const target = e.target as HTMLInputElement;
                              if (target.validity.valueMissing) {
                                target.setCustomValidity(t('teams.validation.experienceRequired'));
                              }
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.setCustomValidity('');
                            }}
                          />
                        </div>
                        <div className="w-32">
                          <select
                            value={formData.experienceUnit || 'years'}
                            onChange={(e) => {
                              const newUnit = e.target.value as 'years' | 'months';
                              setFormData({ 
                                ...formData, 
                                experienceUnit: newUnit,
                                yearsOfExperience: 0 // Reset value when changing unit
                              });
                            }}
                            className="block w-full rounded-md border border-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-3 text-base"
                          >
                            <option value="years">{t('teams.joinForm.experienceYears')}</option>
                            <option value="months">{t('teams.joinForm.experienceMonths')}</option>
                          </select>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.experienceUnit === 'years' 
                          ? t('teams.joinForm.experienceYearsHelp') 
                          : t('teams.joinForm.experienceMonthsHelp')}
                      </p>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">{t('teams.joinForm.skillsTitle')}</h4>
                    <p className="text-sm text-gray-600">{t('teams.joinForm.skillsDescription')}</p>
                    <div className="space-y-3">
                      {formData.skills.map((skill, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={skill}
                              onChange={(e) => handleSkillChange(index, e.target.value)}
                              className="w-full rounded-md border border-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-3 text-base"
                              placeholder={`${t('teams.joinForm.skillPlaceholder')} ${index + 1}`}
                              maxLength={30}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {skill.length}/30 {t('teams.joinForm.characters')}
                            </div>
                          </div>
                          {formData.skills.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSkill(index)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              {t('teams.joinForm.remove')}
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {formData.skills.length < 5 && (
                        <button
                          type="button"
                          onClick={addSkill}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          {t('teams.joinForm.addSkill')}（{formData.skills.length}/5）
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Personality Traits */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">{t('teams.joinForm.traitsTitle')}</h4>
                    <p className="text-sm text-gray-600">{t('teams.joinForm.traitsDescription')}</p>
                    <div className="space-y-3">
                      {formData.personalityTraits.map((trait, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={trait}
                              onChange={(e) => handleTraitChange(index, e.target.value)}
                              className="w-full rounded-md border border-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-3 text-base"
                              placeholder={`${t('teams.joinForm.traitPlaceholder')} ${index + 1}${t('teams.joinForm.traitExamples')}`}
                              maxLength={40}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {trait.length}/40 {t('teams.joinForm.characters')}
                            </div>
                          </div>
                          {formData.personalityTraits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTrait(index)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              {t('teams.joinForm.remove')}
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {formData.personalityTraits.length < 5 && (
                        <button
                              type="button"
                              onClick={() => addTrait()}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              {t('teams.joinForm.addTrait')}（{formData.personalityTraits.length}/5）
                            </button>
                      )}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowJoinForm(null)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {t('teams.joinForm.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {isSubmitting ? t('teams.joining') : t('teams.joinTeam')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
    </ErrorBoundary>
  );
}