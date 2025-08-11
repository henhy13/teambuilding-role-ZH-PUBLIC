'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../context/SessionContext';
import Logger from '../utils/logger';

interface ErrorState {
  error: string | null;
  isLoading: boolean;
}

interface ApiError {
  message?: string;
  error?: string;
  details?: string;
}

/**
 * Global error handler hook that provides consistent error handling
 */
export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
  });
  const { clearSession } = useSession();
  const router = useRouter();

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState(prev => ({ ...prev, error: null }));
  }, []);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // Handle API errors with consistent logic
  const handleError = useCallback((error: unknown, context?: string) => {
          Logger.error(`Error${context ? ` in ${context}` : ''}: ${error}`, 'useErrorHandler');
    
    let errorMessage = '發生未知錯誤';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      const apiError = error as ApiError;
      errorMessage = apiError.message || apiError.error || apiError.details || errorMessage;
    }

    // Handle specific error types
    if (errorMessage.includes('session') && errorMessage.includes('not found')) {
      clearSession();
      return;
    }

    if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      clearSession();
      return;
    }

    setErrorState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
  }, [clearSession]);

  // Wrapper for async operations with error handling
  const withErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: string,
      options?: {
        showLoading?: boolean;
        onSuccess?: (result: T) => void;
        onError?: (error: unknown) => void;
      }
    ): Promise<T | null> => {
      const { showLoading = true, onSuccess, onError } = options || {};
      
      try {
        if (showLoading) {
          setLoading(true);
        }
        clearError();
        
        const result = await operation();
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (error) {
        handleError(error, context);
        
        if (onError) {
          onError(error);
        }
        
        return null;
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [handleError, setLoading, clearError]
  );

  // Wrapper for fetch operations with consistent error handling
  const fetchWithErrorHandling = useCallback(
    async (
      url: string,
      options?: RequestInit,
      context?: string
    ): Promise<any | null> => {
      return withErrorHandling(
        async () => {
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
            ...options,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || data.message || '請求失敗');
          }

          return data;
        },
        context || `fetch ${url}`
      );
    },
    [withErrorHandling]
  );

  return {
    error: errorState.error,
    isLoading: errorState.isLoading,
    clearError,
    setLoading,
    handleError,
    withErrorHandling,
    fetchWithErrorHandling,
  };
}

/**
 * Hook for form submission with error handling
 */
export function useFormSubmission<T = any>() {
  const { withErrorHandling, isLoading, error, clearError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitForm = useCallback(
    async (
      submitFn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void;
        onError?: (error: unknown) => void;
        context?: string;
      }
    ): Promise<T | null> => {
      setIsSubmitting(true);
      
      const result = await withErrorHandling(
        submitFn,
        options?.context || 'form submission',
        {
          showLoading: false,
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }
      );
      
      setIsSubmitting(false);
      return result;
    },
    [withErrorHandling]
  );

  return {
    submitForm,
    isSubmitting: isSubmitting || isLoading,
    error,
    clearError,
  };
}