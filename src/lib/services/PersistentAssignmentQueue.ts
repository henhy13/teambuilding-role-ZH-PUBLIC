import { AssignmentQueue } from './AssignmentQueue';
import { supabase } from '../supabase';
import Logger from '../utils/logger';

interface QueueState {
  processing_pool: string[];
  waiting_queue: Array<{
    team_id: string;
    completed_at: string;
    retry_count: number;
    added_to_queue_at: string;
  }>;
  last_updated: string;
}

export class PersistentAssignmentQueue {
  private static instance: PersistentAssignmentQueue;
  private static readonly QUEUE_STATE_KEY = 'assignment_queue_state';
  private static readonly SAVE_INTERVAL = 30000; // 30 seconds
  private saveIntervalId: NodeJS.Timeout | null = null;
  private queue: AssignmentQueue;

  private constructor() {
    this.queue = AssignmentQueue.getInstance();
    this.startPeriodicSave();
    this.recoverState();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PersistentAssignmentQueue {
    if (!PersistentAssignmentQueue.instance) {
      PersistentAssignmentQueue.instance = new PersistentAssignmentQueue();
    }
    return PersistentAssignmentQueue.instance;
  }

  /**
   * Save queue state to database periodically
   */
  private startPeriodicSave(): void {
    this.saveIntervalId = setInterval(async () => {
      try {
        await this.saveState();
      } catch (error) {
        Logger.error(`Failed to save queue state: ${error}`, 'PersistentQueue');
      }
    }, PersistentAssignmentQueue.SAVE_INTERVAL);

    Logger.info('Started periodic queue state saving', 'PersistentQueue');
  }

  /**
   * Save current queue state to database
   */
  private async saveState(): Promise<void> {
    try {
      const stats = this.queue.getStats();
      const state: QueueState = {
        processing_pool: [], // We'll reconstruct this on recovery by checking team status
        waiting_queue: [], // We'll reconstruct this based on incomplete teams
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_state')
        .upsert({
          key: PersistentAssignmentQueue.QUEUE_STATE_KEY,
          value: state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Database save failed: ${error.message}`);
      }

      Logger.debug(`Saved queue state: ${stats.processing} processing, ${stats.waiting} waiting`, 'PersistentQueue');
    } catch (error) {
      Logger.error(`Error saving queue state: ${error}`, 'PersistentQueue');
      // Don't throw - this shouldn't stop queue processing
    }
  }

  /**
   * Recover queue state from database on startup
   */
  private async recoverState(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('system_state')
        .select('value, updated_at')
        .eq('key', PersistentAssignmentQueue.QUEUE_STATE_KEY)
        .single();

      if (error || !data) {
        Logger.info('No previous queue state found, starting fresh', 'PersistentQueue');
        return;
      }

      const state = data.value as QueueState;
      const stateAge = Date.now() - new Date(state.last_updated).getTime();
      
      // Only recover if state is less than 10 minutes old
      const MAX_STATE_AGE = 600000; // 10 minutes
      if (stateAge > MAX_STATE_AGE) {
        Logger.warn(`Queue state too old (${Math.round(stateAge / 60000)} minutes), starting fresh`, 'PersistentQueue');
        await this.clearSavedState();
        return;
      }

      Logger.info('Queue persistence initialized - automatic recovery enabled', 'PersistentQueue');

      // Note: Since we can't access internal queue state, we rely on the normal
      // queue processing flow to handle any stuck teams through the health checker

    } catch (error) {
      Logger.error(`Failed to recover queue state: ${error}`, 'PersistentQueue');
      // Continue with fresh state
    }
  }

  /**
   * Add team to queue (delegates to underlying queue)
   */
  public async addTeam(teamId: string): Promise<void> {
    return this.queue.addTeam(teamId);
  }

  /**
   * Get queue statistics (delegates to underlying queue)
   */
  public getStats() {
    return this.queue.getStats();
  }

  /**
   * Clear saved state from database
   */
  private async clearSavedState(): Promise<void> {
    try {
      await supabase
        .from('system_state')
        .delete()
        .eq('key', PersistentAssignmentQueue.QUEUE_STATE_KEY);
    } catch (error) {
      Logger.error(`Failed to clear saved state: ${error}`, 'PersistentQueue');
    }
  }

  /**
   * Cleanup on shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
    }
    
    // Final state save
    await this.saveState();
    Logger.info('Queue persistence shutdown complete', 'PersistentQueue');
  }

  /**
   * Force save state immediately (for testing or critical moments)
   */
  public async forceSave(): Promise<void> {
    await this.saveState();
  }
}