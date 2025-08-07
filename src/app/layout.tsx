'use client';

import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SessionProvider, useSessionState } from '../lib/context/SessionContext'
import { LanguageProvider } from '../lib/context/LanguageContext'
import { LanguageToggle } from '../components/common/LanguageToggle'
import { FloatingLanguageToggle } from '../components/ui/FloatingLanguageToggle'
import { useTranslation } from '../lib/hooks/useTranslation'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { mounted, currentSession } = useSessionState();
  const { t } = useTranslation();
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword || isAuthenticating) return;

    setIsAuthenticating(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminAccess', 'true');
        router.push('/admin');
      } else {
        alert(data.error || t('layout.errors.authFailed'));
      }
    } catch {
      alert(t('layout.errors.networkError'));
    } finally {
      setIsAuthenticating(false);
      setAdminPassword('');
    }
  };

  const isAdminPage = pathname?.startsWith('/admin');
  const isHomePage = pathname === '/';

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2 sm:space-x-8">
                <Link
                  href="/"
                  className={`text-sm sm:text-xl text-gray-900 hover:text-blue-600 ${
                    pathname === '/' ? 'text-blue-600 font-medium' : ''
                  }`}
                >
                  {t('layout.navigation.joinSession')}
                </Link>

                {mounted && currentSession && !isAdminPage && (
                  <nav className="flex space-x-1 sm:space-x-4">
                    <Link
                      href="/teams"
                      className={`px-1 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                        pathname === '/teams' 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('layout.navigation.teams')}
                    </Link>
                    <Link
                      href="/results"
                      className={`px-1 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                        pathname?.startsWith('/results') 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('layout.navigation.results')}
                    </Link>
                  </nav>
                )}
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <LanguageToggle />
                
                {mounted && currentSession && !isAdminPage && (
                  <div className="text-xs sm:text-sm text-gray-500 flex items-center">
                    <span className="mr-1 sm:mr-2 whitespace-nowrap">{t('layout.header.currentSession')}</span>
                    <span className="font-mono text-blue-600 text-xs sm:text-sm">{currentSession.settings.sessionCode}</span>
                  </div>
                )}

                {(isHomePage || (mounted && !currentSession && !isAdminPage)) && (
                  <form onSubmit={handleAdminAuth} className="hidden md:flex items-center space-x-2">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder={t('layout.header.adminPasswordPlaceholder')}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isAuthenticating}
                    />
                    <button
                      type="submit"
                      disabled={!adminPassword || isAuthenticating}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAuthenticating ? t('layout.header.loading') : t('layout.header.login')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
        
        <FloatingLanguageToggle />

        <footer className="bg-transparent border-t border-gray-300 mt-auto">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center">
              <a 
                href="https://github.com/henhy13" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group flex items-center text-gray-900 font-medium text-base px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-gray-400 hover:bg-white/20 hover:scale-105 hover:shadow-lg transition-all duration-300 ease-out hover:border-gray-600"
              >
                <svg 
                  className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" 
                  fill="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="group-hover:text-black-200 transition-colors duration-300">Credit & Policy</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </a>
            </div>
          </div>
        </footer>
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Team Role Assignment System</title>
        <meta name="description" content="Team role assignment system" />
      </head>
      <body>
        <SessionProvider>
          <LanguageProvider>
            <LayoutContent>{children}</LayoutContent>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  )
}