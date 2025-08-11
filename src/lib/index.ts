// Barrel export for cleaner imports across the application
// This allows importing from @/lib instead of deep relative paths

// Managers
export * from './managers';

// Services  
export * from './services';

// Hooks
export * from './hooks';

// Utils
export * from './utils';

// Context
export * from './context';

// Validation
export * from './validation';

// Types and shared utilities
export * from './shared-types';
export { supabase } from './supabase';