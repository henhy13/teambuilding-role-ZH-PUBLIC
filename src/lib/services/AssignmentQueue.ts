import { AssignmentProcessor } from './AssignmentProcessor';
import Logger from '../utils/logger';

interface QueueItem {
  teamId: string;
  completedAt: Date;
  retryCount: number;
  addedToQueueAt: Date;
}

interface QueueStats {
  processing: number;
  waiting: number;
  totalProcessed: number;
  totalFailed: number;
}

export class AssignmentQueue {
  private static instance: AssignmentQueue;
  
  // Core queue state
  private processingPool: Set<string> = new Set();
  private waitingQueue: QueueItem[] = [];
  
  // Configuration
  private readonly MAX_CONCURRENT = 3;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 5000; // 5 seconds
  private readonly RETRY_DELAY_MULTIPLIER = 2; // Exponential backoff
  
  // Statistics
  private stats: QueueStats = {
    processing: 0,
    waiting: 0,
    totalProcessed: 0,
    totalFailed: 0
  };

  private constructor() {
    Logger.info('AssignmentQueue initialized', 'AssignmentQueue');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AssignmentQueue {
    if (!AssignmentQueue.instance) {
      AssignmentQueue.instance = new AssignmentQueue();
    }
    return AssignmentQueue.instance;
  }

  /**
   * Add a team to the assignment queue
   */
  public async addTeam(teamId: string): Promise<void> {
    try {
      // Check if team is already in processing or queue
      if (this.processingPool.has(teamId)) {
        Logger.warn(`Team ${teamId} is already being processed`, 'AssignmentQueue');
        return;
      }

      if (this.waitingQueue.find(item => item.teamId === teamId)) {
        Logger.warn(`Team ${teamId} is already in queue`, 'AssignmentQueue');
        return;
      }

      const queueItem: QueueItem = {
        teamId,
        completedAt: new Date(),
        retryCount: 0,
        addedToQueueAt: new Date()
      };

      // If processing pool has space, start immediately
      if (this.processingPool.size < this.MAX_CONCURRENT) {
        Logger.info(`Queue: Starting immediate processing for team ${teamId} (slot ${this.processingPool.size + 1}/${this.MAX_CONCURRENT})`, 'AssignmentQueue');
        await this.startProcessing(queueItem);
      } else {
        // Add to waiting queue
        this.waitingQueue.push(queueItem);
        Logger.info(`Queue: Team ${teamId} added to waiting queue (position ${this.waitingQueue.length}). Pool: ${this.processingPool.size}/${this.MAX_CONCURRENT}`, 'AssignmentQueue');
      }

      this.updateStats();
      this.logQueueStatus();

    } catch (error) {
      Logger.error(`Error adding team ${teamId} to queue: ${error}`, 'AssignmentQueue');
    }
  }

  /**
   * Start processing a team assignment
   */
  private async startProcessing(queueItem: QueueItem): Promise<void> {
    const { teamId } = queueItem;
    
    try {
      // Add to processing pool
      this.processingPool.add(teamId);
      this.updateStats();

      Logger.info(`Queue: Processing started for team ${teamId} (retry ${queueItem.retryCount}/${this.MAX_RETRIES})`, 'AssignmentQueue');

      // Start the assignment process
      AssignmentProcessor.triggerAutoAssignment(teamId)
        .then(() => {
          // Processing completed successfully
          this.onProcessingComplete(teamId, true);
        })
        .catch((error) => {
          // Processing failed
          Logger.error(`Assignment processing failed for team ${teamId}: ${error}`, 'AssignmentQueue');
          this.onProcessingComplete(teamId, false, queueItem);
        });

    } catch (error) {
      Logger.error(`Error starting processing for team ${teamId}: ${error}`, 'AssignmentQueue');
      this.onProcessingComplete(teamId, false, queueItem);
    }
  }

  /**
   * Handle completion of team processing
   */
  private async onProcessingComplete(teamId: string, success: boolean, originalQueueItem?: QueueItem): Promise<void> {
    try {
      // Remove from processing pool
      this.processingPool.delete(teamId);
      
      if (success) {
        Logger.info(`Queue: Processing completed successfully for team ${teamId}`, 'AssignmentQueue');
        this.stats.totalProcessed++;
      } else {
        Logger.warn(`Queue: Processing failed for team ${teamId}`, 'AssignmentQueue');
        
        // Handle retry logic
        if (originalQueueItem && originalQueueItem.retryCount < this.MAX_RETRIES) {
          await this.retryTeam(originalQueueItem);
        } else {
          Logger.error(`Queue: Team ${teamId} exceeded max retries (${this.MAX_RETRIES}), giving up`, 'AssignmentQueue');
          this.stats.totalFailed++;
        }
      }

      this.updateStats();
      
      // Process next team in queue
      await this.processNext();

    } catch (error) {
      Logger.error(`Error handling completion for team ${teamId}: ${error}`, 'AssignmentQueue');
      // Still try to process next
      await this.processNext();
    }
  }

  /**
   * Retry a failed team assignment
   */
  private async retryTeam(queueItem: QueueItem): Promise<void> {
    const retryDelay = this.RETRY_DELAY_BASE * Math.pow(this.RETRY_DELAY_MULTIPLIER, queueItem.retryCount);
    
    Logger.info(`Queue: Retrying team ${queueItem.teamId} in ${retryDelay}ms (attempt ${queueItem.retryCount + 1}/${this.MAX_RETRIES})`, 'AssignmentQueue');
    
    // Update retry count
    queueItem.retryCount++;
    
    // Add delay before retry
    setTimeout(async () => {
      // Add back to front of queue for priority retry
      this.waitingQueue.unshift(queueItem);
      await this.processNext();
    }, retryDelay);
  }

  /**
   * Process the next team in queue if slot available
   */
  private async processNext(): Promise<void> {
    try {
      // Check if we have available slots and teams waiting
      if (this.processingPool.size >= this.MAX_CONCURRENT || this.waitingQueue.length === 0) {
        return;
      }

      // Get next team from queue (FIFO)
      const nextItem = this.waitingQueue.shift();
      if (!nextItem) {
        return;
      }

      Logger.info(`Queue: Processing next team ${nextItem.teamId} from queue (${this.waitingQueue.length} remaining)`, 'AssignmentQueue');
      
      await this.startProcessing(nextItem);

    } catch (error) {
      Logger.error(`Error processing next team in queue: ${error}`, 'AssignmentQueue');
    }
  }

  /**
   * Update queue statistics
   */
  private updateStats(): void {
    this.stats.processing = this.processingPool.size;
    this.stats.waiting = this.waitingQueue.length;
  }

  /**
   * Log current queue status
   */
  private logQueueStatus(): void {
    Logger.info(`Queue Status: Processing ${this.stats.processing}/${this.MAX_CONCURRENT}, Waiting ${this.stats.waiting}, Completed ${this.stats.totalProcessed}, Failed ${this.stats.totalFailed}`, 'AssignmentQueue');
  }

  /**
   * Get current queue statistics
   */
  public getStats(): QueueStats & { processingTeams: string[], waitingTeams: string[] } {
    return {
      ...this.stats,
      processingTeams: Array.from(this.processingPool),
      waitingTeams: this.waitingQueue.map(item => item.teamId)
    };
  }

  /**
   * Get queue position for a specific team
   */
  public getTeamQueuePosition(teamId: string): { status: 'processing' | 'waiting' | 'not-found', position?: number } {
    if (this.processingPool.has(teamId)) {
      return { status: 'processing' };
    }

    const queueIndex = this.waitingQueue.findIndex(item => item.teamId === teamId);
    if (queueIndex !== -1) {
      return { status: 'waiting', position: queueIndex + 1 };
    }

    return { status: 'not-found' };
  }

  /**
   * Force retry a specific team (admin function)
   */
  public async forceRetryTeam(teamId: string): Promise<boolean> {
    try {
      // Remove from processing pool if present
      if (this.processingPool.has(teamId)) {
        this.processingPool.delete(teamId);
        Logger.info(`Queue: Removed team ${teamId} from processing pool for force retry`, 'AssignmentQueue');
      }

      // Remove from waiting queue if present
      const queueIndex = this.waitingQueue.findIndex(item => item.teamId === teamId);
      if (queueIndex !== -1) {
        this.waitingQueue.splice(queueIndex, 1);
        Logger.info(`Queue: Removed team ${teamId} from waiting queue for force retry`, 'AssignmentQueue');
      }

      // Add as new item
      await this.addTeam(teamId);
      return true;

    } catch (error) {
      Logger.error(`Error force retrying team ${teamId}: ${error}`, 'AssignmentQueue');
      return false;
    }
  }

  /**
   * Clear the queue (admin function)
   */
  public clearQueue(): void {
    this.waitingQueue = [];
    this.processingPool.clear();
    this.stats = {
      processing: 0,
      waiting: 0,
      totalProcessed: 0,
      totalFailed: 0
    };
    Logger.info('Queue: Cleared all queue data', 'AssignmentQueue');
  }
} 