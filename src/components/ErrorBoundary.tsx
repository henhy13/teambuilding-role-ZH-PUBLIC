'use client';

import React from 'react';
import Logger from '../lib/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Logger.error(`React Error Boundary caught error: ${error.message}`, 'ErrorBoundary');
    Logger.error(`Error stack: ${error.stack}`, 'ErrorBoundary');
    Logger.error(`Component stack: ${errorInfo.componentStack}`, 'ErrorBoundary');
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">出現錯誤</h2>
              <p className="text-gray-600 mb-6">應用程式遇到意外錯誤，請重試。</p>
              <button
                onClick={this.retry}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
              >
                重試
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default fallback component for assignment-related errors
export const AssignmentErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
    <div className="flex">
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">處理錯誤</h3>
        <div className="mt-2 text-sm text-red-700">
          <p>角色分配過程中出現錯誤。這可能是暫時性問題。</p>
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="cursor-pointer">技術詳情</summary>
              <pre className="mt-1 text-xs overflow-auto">{error.message}</pre>
            </details>
          )}
        </div>
        <div className="mt-4">
          <button
            onClick={retry}
            className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
          >
            重試
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Loading error fallback for data fetching errors
export const LoadingErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
        <p className="mt-2 text-sm text-gray-500">
          無法載入資料。請檢查網路連線並重試。
        </p>
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-400">錯誤詳情</summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <div className="mt-6">
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            重新載入
          </button>
        </div>
      </div>
    </div>
  </div>
);