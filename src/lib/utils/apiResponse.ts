/**
 * Standardized API response utility
 * Ensures consistent response formats across all API endpoints
 */

export interface StandardApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any; // Allow additional fields for data
}

export class ApiResponse {
  /**
   * Create a successful response
   */
  static success<T>(
    data: T,
    message?: string,
    statusCode: number = 200
  ): { statusCode: number; body: StandardApiResponse<T> } {
    const response: StandardApiResponse<T> = {
      success: true,
      ...data,
    };
    
    if (message) {
      response.message = message;
    }
    
    return {
      statusCode,
      body: response
    };
  }

  /**
   * Create an error response
   */
  static error(
    error: string,
    statusCode: number = 500,
    details?: any
  ): { statusCode: number; body: StandardApiResponse } {
    const response: StandardApiResponse = {
      success: false,
      error,
    };
    
    if (details) {
      response.details = details;
    }
    
    return {
      statusCode,
      body: response
    };
  }

  /**
   * Create a validation error response
   */
  static validationError(
    error: string,
    validationErrors?: any
  ): { statusCode: number; body: StandardApiResponse } {
    const response: StandardApiResponse = {
      success: false,
      error,
    };
    
    if (validationErrors) {
      response.validationErrors = validationErrors;
    }
    
    return {
      statusCode: 400,
      body: response
    };
  }

  /**
   * Create a not found error response
   */
  static notFound(
    resource: string = 'Resource'
  ): { statusCode: number; body: StandardApiResponse } {
    return {
      statusCode: 404,
      body: {
        success: false,
        error: `${resource} not found`
      }
    };
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(
    message: string = 'Unauthorized access'
  ): { statusCode: number; body: StandardApiResponse } {
    return {
      statusCode: 401,
      body: {
        success: false,
        error: message
      }
    };
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(
    message: string = 'Access forbidden'
  ): { statusCode: number; body: StandardApiResponse } {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: message
      }
    };
  }

  /**
   * Create a method not allowed error response
   */
  static methodNotAllowed(
    allowedMethods: string[] = []
  ): { statusCode: number; body: StandardApiResponse } {
    const message = allowedMethods.length > 0 
      ? `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`
      : 'Method not allowed';
      
    return {
      statusCode: 405,
      body: {
        success: false,
        error: message
      }
    };
  }
}

/**
 * Helper function to send standardized API responses
 */
export function sendApiResponse<T>(
  res: any,
  response: { statusCode: number; body: StandardApiResponse<T> }
) {
  return res.status(response.statusCode).json(response.body);
}