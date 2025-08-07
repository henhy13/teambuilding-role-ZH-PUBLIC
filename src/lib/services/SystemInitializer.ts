import { AssignmentHealthChecker } from './AssignmentHealthChecker';
import { PersistentAssignmentQueue } from './PersistentAssignmentQueue';
import Logger from '../utils/logger';

/**
 * Initialize system-wide services
 * Should be called once when the application starts
 */
export class SystemInitializer {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      Logger.warn('SystemInitializer already initialized', 'SystemInitializer');
      return;
    }

    try {
      Logger.info('Initializing system services...', 'SystemInitializer');

      // Initialize persistent queue (automatically recovers state)
      PersistentAssignmentQueue.getInstance();

      // Start the assignment health checker
      AssignmentHealthChecker.startHealthChecker();

      this.initialized = true;
      Logger.info('System services initialized successfully', 'SystemInitializer');
    } catch (error) {
      Logger.error(`Failed to initialize system services: ${error}`, 'SystemInitializer');
      throw error;
    }
  }

  static async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      Logger.info('Shutting down system services...', 'SystemInitializer');

      // Shutdown persistent queue
      await PersistentAssignmentQueue.getInstance().shutdown();

      // Stop the assignment health checker
      AssignmentHealthChecker.stopHealthChecker();

      this.initialized = false;
      Logger.info('System services shut down successfully', 'SystemInitializer');
    } catch (error) {
      Logger.error(`Error during system shutdown: ${error}`, 'SystemInitializer');
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}

// Auto-initialize in production environment
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Only initialize server-side in production
  SystemInitializer.initialize();
}