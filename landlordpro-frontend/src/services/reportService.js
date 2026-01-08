import axios from 'axios';
import { showError } from '../utils/toastHelper';
import { getLoggedInUser } from './AuthService';

// Determine the correct base URL based on user role
const getReportsBaseURL = () => {
    const user = getLoggedInUser();
    const role = user?.role?.toLowerCase();
    const baseUrl = import.meta.env.VITE_API_BASE_URL;

    console.log('📊 Reports Service - Determining base URL:', {
        userRole: role,
        hasUser: !!user,
        userId: user?.id
    });

    if (role === 'manager') {
        const url = baseUrl ? `${baseUrl}/api/manager/reports` : 'http://localhost:3000/api/manager/reports';
        console.log('📊 Using manager reports URL:', url);
        return url;
    }
    const url = baseUrl ? `${baseUrl}/api/reports` : 'http://localhost:3000/api/reports';
    console.log('📊 Using admin reports URL:', url);
    return url;
};

const axiosInstance = axios.create({
    timeout: 20000, // Longer timeout for heavy reports
});

// Set base URL dynamically based on user role
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;

        // Set base URL dynamically
        if (!config.baseURL) {
            config.baseURL = getReportsBaseURL();
        }

        console.log('📊 Reports API Request:', {
            url: config.url,
            baseURL: config.baseURL,
            fullURL: `${config.baseURL}${config.url}`,
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
        });

        return config;
    },
    (error) => Promise.reject(error)
);

export const getFinancialSummary = async (params) => {
    try {
        const { data } = await axiosInstance.get('/financials', { params });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch financial data');
        throw err;
    }
};

export const getOccupancyStats = async (propertyId = null) => {
    try {
        const { data } = await axiosInstance.get('/occupancy', { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch occupancy stats');
        throw err;
    }
};

export const getRentRoll = async (propertyId = null) => {
    try {
        const { data } = await axiosInstance.get('/rent-roll', { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch rent roll');
        throw err;
    }
};

export const getArrearsReport = async (propertyId = null) => {
    try {
        const { data } = await axiosInstance.get('/arrears', { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch arrears report');
        throw err;
    }
};

export const getLeaseExpirations = async (propertyId = null, days = 90) => {
    try {
        const { data } = await axiosInstance.get('/lease-expirations', { params: { propertyId, days } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch lease expirations');
        throw err;
    }
};

export const getVacancyReport = async (propertyId = null) => {
    try {
        const { data } = await axiosInstance.get('/vacancy', { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch vacancy report');
        throw err;
    }
};
