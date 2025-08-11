type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
}

class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  static log(level: LogLevel, message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      level,
      message,
      timestamp,
      context
    };

    // In development, log to console with formatting
    if (this.isDevelopment) {
      const prefix = context ? `[${context}]` : '';
      const formattedMessage = `${timestamp} ${prefix} ${message}`;
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
    
    // In production, you could send to external logging service
    // For now, only log errors to console in production
    if (!this.isDevelopment && level === 'error') {
      console.error(`${timestamp} [ERROR] ${message}`);
    }
  }

  static debug(message: string, context?: string): void {
    this.log('debug', message, context);
  }

  static info(message: string, context?: string): void {
    this.log('info', message, context);
  }

  static warn(message: string, context?: string): void {
    this.log('warn', message, context);
  }

  static error(message: string, context?: string): void {
    this.log('error', message, context);
  }
}

export default Logger;