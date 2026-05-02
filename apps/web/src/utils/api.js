const BASE_URL = '/api';
// Flag to prevent multiple logout events/alerts
let isLoggingOut = false;
export const api = {
    get: async (url, options = {}) => {
        return request(url, { ...options, method: 'GET' });
    },
    post: async (url, body, options = {}) => {
        return request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
    },
    put: async (url, body, options = {}) => {
        return request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
    },
    delete: async (url, options = {}) => {
        return request(url, { ...options, method: 'DELETE' });
    },
};
async function request(url, options) {
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
        return {};
    }
    return response.json();
}
