import axios from 'axios';

/**
 * Tentukan API Base URL secara dinamis:
 * 1. Jika diset VITE_API_URL pada environment / build, gunakan itu.
 * 2. Jika diakses di browser pada domain bimapratama.com, arahkan ke https://api.bimapratama.com/api/v1.
 * 3. Jika diakses di localhost atau 127.0.0.1, gunakan http://localhost:4000/api/v1.
 * 4. Jika diakses di domain/IP lain, arahkan ke port 4000 atau /api/v1 secara dinamis.
 */
export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    // Production bimapratama ecosystem
    if (hostname.includes('bimapratama.com')) {
      return `${protocol}//api.bimapratama.com/api/v1`;
    }

    // Localhost / Development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api/v1';
    }

    // Custom Host / IP Network deployment
    return `${protocol}//${hostname}:4000/api/v1`;
  }

  return 'http://localhost:4000/api/v1';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Otomatis inject Bearer token jika ada di localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor untuk handle error 401 (Unauthorized)
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error.message);
  },
);
