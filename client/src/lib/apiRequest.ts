/**
 * Utility function for making API requests with common error handling
 * 
 * @param endpoint - The API endpoint to call (e.g., "/api/github/repos")
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the response data
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  // Automatically stringify JSON bodies
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, config);

  // Handle HTTP errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  // Parse and return JSON response
  try {
    return await response.json();
  } catch (error) {
    // Return empty object if response is not JSON
    return {};
  }
}