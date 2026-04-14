const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const headers = new Headers(options?.headers);
  headers.append('Content-Type', 'application/json');
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) // Gracefully handle non-json error responses
    const errorMessage = errorBody.message || `An error occurred: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return response.json();
}
