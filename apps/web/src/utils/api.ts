const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Flag to prevent multiple logout events/alerts
let isLoggingOut = false;

export const api = {
  get: async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
    return request<T>(url, { ...options, method: 'GET' });
  },
  post: async <T>(url: string, body: unknown, options: RequestOptions = {}): Promise<T> => {
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },
  put: async <T>(url: string, body: unknown, options: RequestOptions = {}): Promise<T> => {
    return request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },
  delete: async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
    return request<T>(url, { ...options, method: 'DELETE' });
  },
};

async function request<T>(url: string, options: RequestOptions): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !isLoggingOut) {
      isLoggingOut = true;
      window.dispatchEvent(new CustomEvent('auth:logout'));
      
      // Reset flag after a while to allow future alerts if user logs in again
      setTimeout(() => {
        isLoggingOut = false;
      }, 5000);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
