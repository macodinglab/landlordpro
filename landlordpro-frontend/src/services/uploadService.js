import apiClient from './apiClient';
import { showError, showSuccess } from '../utils/toastHelper';

const BASE_PATH = '/upload';

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const { data } = await apiClient.post(BASE_PATH, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 15000,
        });
        showSuccess('Image uploaded successfully');
        return data.fileUrl; // This should be the full URL
    } catch (err) {
        showError(err.response?.data?.message || 'Failed to upload image');
        throw err;
    }
};
