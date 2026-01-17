import axios from 'axios';

/**
 * ------------------------------------------------------------------
 * 🛡️ Hardened API Client
 * ------------------------------------------------------------------
 * This client is the ONLY allowed way to allow API requests.
 * It enforces strict strict URL normalization to prevent double-slash bugs.
 */

// 1. Normalize Base URL (Strip trailing slashes) 
const normalizeBaseURL = (url) => {
    if (!url) return '';
    return url.trim().replace(/\/+$/, '');
};

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const NORMALIZED_BASE_URL = normalizeBaseURL(RAW_BASE_URL);

// 2. Create Axios Instance
const apiClient = axios.create({
    baseURL: `${NORMALIZED_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

console.log('🚀 API Client Initialized:', {
    raw: RAW_BASE_URL,
    normalized: NORMALIZED_BASE_URL,
    finalBaseURL: apiClient.defaults.baseURL
});

// 3. Request Interceptor: Inject Token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 4. Response Interceptor (Optional: Global Error Handling)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // You can add global error handling here if needed
        return Promise.reject(error);
    }
);

export default apiClient;
