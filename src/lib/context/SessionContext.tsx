'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Session, Team } from '../../types';
import { useRouter } from 'next/navigation';
import Logger from '../utils/logger';

// Types for session state
interface SessionState {
  sessionId: string | null;
  currentSession: Session | null;
  currentTeam: Team | null;
  isAdmin: boolean;
  sessionStatus: 'loading' | 'active' | 'ended' | 'error' | null;
  mounted: boolean;
}

// Types for assignment state
interface AssignmentState {
  loading: boolean;
  hasAssignment: boolean;
  assignmentStatus: 'pending' | 'processing' | 'completed' | 'error' | null;
  processingMessage?: string;
  error?: string;
}

// Combined context state
interface AppState {
  session: SessionState;
  assignment: AssignmentState;
}

// Action types
type SessionAction =
  | { type: 'SET_MOUNTED'; payload: boolean }
  | { type: 'SET_SESSION'; payload: { session: Session; sessionId: string } }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_CURRENT_TEAM'; payload: Team | null }
  | { type: 'SET_ADMIN_STATUS'; payload: boolean }
  | { type: 'SET_SESSION_STATUS'; payload: SessionState['sessionStatus'] }
  | { type: 'SET_ASSIGNMENT_LOADING'; payload: boolean }
  | { type: 'SET_ASSIGNMENT_STATE'; payload: Partial<AssignmentState> }
  | { type: 'RESET_ASSIGNMENT_STATE' };

// Initial state
const initialState: AppState = {
  session: {
    sessionId: null,
    currentSession: null,
    currentTeam: null,
    isAdmin: false,
    sessionStatus: null,
    mounted: false,
  },
  assignment: {
    loading: false,
    hasAssignment: false,
    assignmentStatus: null,
  },
};

// Reducer
function appReducer(state: AppState, action: SessionAction): AppState {
  switch (action.type) {
    case 'SET_MOUNTED':
      return {
        ...state,
        session: { ...state.session, mounted: action.payload },
      };
    case 'SET_SESSION':
      return {
        ...state,
        session: {
          ...state.session,
          sessionId: action.payload.sessionId,
          currentSession: action.payload.session,
          sessionStatus: 'active',
        },
      };
    case 'CLEAR_SESSION':
      return {
        ...state,
        session: {
          ...initialState.session,
          mounted: state.session.mounted,
        },
        assignment: initialState.assignment,
      };
    case 'SET_CURRENT_TEAM':
      return {
        ...state,
        session: { ...state.session, currentTeam: action.payload },
      };
    case 'SET_ADMIN_STATUS':
      return {
        ...state,
        session: { ...state.session, isAdmin: action.payload },
      };
    case 'SET_SESSION_STATUS':
      return {
        ...state,
        session: { ...state.session, sessionStatus: action.payload },
      };
    case 'SET_ASSIGNMENT_LOADING':
      return {
        ...state,
        assignment: { ...state.assignment, loading: action.payload },
      };
    case 'SET_ASSIGNMENT_STATE':
      return {
        ...state,
        assignment: { ...state.assignment, ...action.payload },
      };
    case 'RESET_ASSIGNMENT_STATE':
      return {
        ...state,
        assignment: initialState.assignment,
      };
    default:
      return state;
  }
}

// Context
interface SessionContextType {
  state: AppState;
  dispatch: React.Dispatch<SessionAction>;
  // Helper functions
  initializeSession: () => void;
  clearSession: () => void;
  refreshSession: (sessionId: string) => Promise<void>;
  updateAssignmentStatus: (teamId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Provider component
interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const router = useRouter();

  // Initialize session from sessionStorage
  const initializeSession = () => {
    if (typeof window === 'undefined') return;
    
    const sessionData = sessionStorage.getItem('currentSession');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        dispatch({
          type: 'SET_SESSION',
          payload: { session, sessionId: session.id },
        });
      } catch (error) {
        Logger.error(`Invalid session data: ${error}`, 'SessionContext');
        sessionStorage.removeItem('currentSession');
        dispatch({ type: 'CLEAR_SESSION' });
      }
    }
  };

  // Clear session and redirect
  const clearSession = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('currentSession');
    }
    dispatch({ type: 'CLEAR_SESSION' });
    router.push('/');
  };

  // Refresh session data from server
  const refreshSession = async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_SESSION_STATUS', payload: 'loading' });
      
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (data.success) {
        const updatedSession = data.sessions.find((s: Session) => s.id === sessionId);
        if (updatedSession) {
          // Update sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentSession', JSON.stringify(updatedSession));
          }
          
          dispatch({
            type: 'SET_SESSION',
            payload: { session: updatedSession, sessionId: updatedSession.id },
          });
        } else {
          throw new Error('Session not found');
        }
      } else {
        throw new Error(data.error || 'Failed to refresh session');
      }
    } catch (error) {
      Logger.error(`Failed to refresh session: ${error}`, 'SessionContext');
      dispatch({ type: 'SET_SESSION_STATUS', payload: 'error' });
      // Fallback to cached session data
      initializeSession();
    }
  };

  // Update assignment status for a team
  const updateAssignmentStatus = async (teamId: string) => {
    try {
      dispatch({ type: 'SET_ASSIGNMENT_LOADING', payload: true });
      
      const response = await fetch(`/api/getAssignments?teamId=${teamId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          const { session: assignmentSession } = data.data;
          
          dispatch({
            type: 'SET_ASSIGNMENT_STATE',
            payload: {
              hasAssignment: true,
              assignmentStatus: assignmentSession?.status || 'pending',
              processingMessage: assignmentSession?.status === 'processing' 
                ? '正在分配角色中，請稍候...'
                : undefined,
              error: undefined,
            },
          });
        } else {
          dispatch({
            type: 'SET_ASSIGNMENT_STATE',
            payload: {
              hasAssignment: false,
              assignmentStatus: null,
              error: undefined,
            },
          });
        }
      } else {
        throw new Error('Failed to fetch assignment status');
      }
    } catch (error) {
      Logger.error(`Error updating assignment status: ${error}`, 'SessionContext');
      dispatch({
        type: 'SET_ASSIGNMENT_STATE',
        payload: {
          assignmentStatus: 'error',
          error: '獲取分配狀態失敗',
        },
      });
    } finally {
      dispatch({ type: 'SET_ASSIGNMENT_LOADING', payload: false });
    }
  };

  // Set mounted state on client
  useEffect(() => {
    dispatch({ type: 'SET_MOUNTED', payload: true });
    initializeSession();
  }, []);

  // Listen for storage changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = () => {
      initializeSession();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const contextValue: SessionContextType = {
    state,
    dispatch,
    initializeSession,
    clearSession,
    refreshSession,
    updateAssignmentStatus,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook to use session context
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Convenience hooks
export function useSessionState() {
  const { state } = useSession();
  return state.session;
}

export function useAssignmentState() {
  const { state } = useSession();
  return state.assignment;
}

export function useSessionActions() {
  const { dispatch, clearSession, refreshSession, updateAssignmentStatus } = useSession();
  return { dispatch, clearSession, refreshSession, updateAssignmentStatus };
}