export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  const data = await res.json();
  return data.data || data;
}

export async function fetchWithAuth<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    // Try to parse error response from server
    try {
      const errorData = await res.json();
      const errorMessage = errorData.error?.message || errorData.message || `Error: ${res.status}`;
      throw new Error(errorMessage);
    } catch (parseError) {
      // If JSON parsing fails, use generic error
      throw new Error(`API Error: ${res.status}`);
    }
  }
  const data = await res.json();
  return data.data || data;
}
