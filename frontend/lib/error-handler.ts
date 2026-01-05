/**
 * Centralized error handling utilities
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Extract error message from API response or error object
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

/**
 * Handle API errors consistently
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = 'Request failed';
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorMessage;
  } catch {
    // If response is not JSON, use status text
    errorMessage = response.statusText || errorMessage;
  }
  
  throw new Error(errorMessage);
}

/**
 * Handle network errors consistently
 */
export function handleNetworkError(error: unknown, apiUrl: string): Error {
  const errorMessage = extractErrorMessage(error);
  
  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    (error instanceof TypeError && error.message.includes('fetch'))
  ) {
    return new Error(
      `Cannot connect to backend API at ${apiUrl}. Please ensure the backend is running and accessible.`
    );
  }
  
  return error instanceof Error ? error : new Error(errorMessage);
}

