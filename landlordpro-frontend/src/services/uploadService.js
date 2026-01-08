import axios from 'axios';
import { showError, showSuccess } from '../utils/toastHelper';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL + '/api/upload';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const { data } = await axiosInstance.post('/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        showSuccess('Image uploaded successfully');
        return data.fileUrl; // This should be the full URL
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to upload image');
        throw err;
    }
};
