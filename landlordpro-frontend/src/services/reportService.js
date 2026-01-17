import apiClient from './apiClient';
import { showError } from '../utils/toastHelper';
import { getLoggedInUser } from './AuthService';

// Determine the correct endpoint prefix based on user role
const getReportPrefix = () => {
    const user = getLoggedInUser();
    const role = user?.role?.toLowerCase();

    if (role === 'manager') {
        return '/manager/reports';
    }
    return '/reports';
};

export const getFinancialSummary = async (params) => {
    try {
        const prefix = getReportPrefix();
        const { data } = await apiClient.get(`${prefix}/financials`, { params });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch financial data');
        throw err;
    }
};

export const getOccupancyStats = async (propertyId = null) => {
    try {
        const prefix = getReportPrefix();
        const { data } = await apiClient.get(`${prefix}/occupancy`, { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch occupancy stats');
        throw err;
    }
};

export const getRentRoll = async (propertyId = null) => {
    try {
        const prefix = getReportPrefix();
        const { data } = await apiClient.get(`${prefix}/rent-roll`, { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch rent roll');
        throw err;
    }
};

export const getArrearsReport = async (propertyId = null) => {
    try {
        const prefix = getReportPrefix();
        const { data } = await apiClient.get(`${prefix}/arrears`, { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch arrears report');
        throw err;
    }
};

export const getLeaseExpirations = async (propertyId = null, days = 90) => {
    try {
        const prefix = getReportPrefix();
        const { data } = await apiClient.get(`${prefix}/lease-expirations`, { params: { propertyId, days } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch lease expirations');
        throw err;
    }
};

export const getVacancyReport = async (propertyId = null) => {
    try {
        const prefix = getReportPrefix();
        const { data } = await apiClient.get(`${prefix}/vacancy`, { params: { propertyId } });
        return data.data;
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to fetch vacancy report');
        throw err;
    }
};
