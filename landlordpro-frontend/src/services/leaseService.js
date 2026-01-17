// leaseService.js
import apiClient from './apiClient';

const leaseService = {
  /**
   * ✅ Fetch all leases (supports pagination and optional filtering by status)
   */
  getLeases: async (page = 1, limit = 10, status = '') => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);

      // Using apiClient with relative path
      const res = await apiClient.get(`/leases?${params.toString()}`);

      return res.data;
    } catch (err) {
      console.error('❌ Failed to fetch leases:', err);
      throw err.response?.data || err;
    }
  },

  /**
   * ✅ Get a single lease by ID
   */
  getLeaseById: async (id) => {
    try {
      const res = await apiClient.get(`/leases/${id}`);
      return res.data;
    } catch (err) {
      console.error(`❌ Failed to fetch lease ${id}:`, err);
      throw err.response?.data || err;
    }
  },

  /**
   * ✅ Create a new lease
   */
  createLease: async (leaseData) => {
    try {
      const payload = {
        startDate: leaseData.startDate,
        endDate: leaseData.endDate,
        leaseAmount: leaseData.leaseAmount,
        localId: leaseData.localId,
        tenantId: leaseData.tenantId,
        status: leaseData.status || 'active',
      };

      const res = await apiClient.post(`/leases`, payload);

      return res.data;
    } catch (err) {
      console.error('❌ Failed to create lease:', err);
      throw err.response?.data || err;
    }
  },

  /**
   * ✅ Update an existing lease
   */
  updateLease: async (id, leaseData) => {
    try {
      const payload = {
        startDate: leaseData.startDate,
        endDate: leaseData.endDate,
        leaseAmount: leaseData.leaseAmount,
        localId: leaseData.localId,
        tenantId: leaseData.tenantId,
        status: leaseData.status,
      };

      const res = await apiClient.put(`/leases/${id}`, payload);

      return res.data;
    } catch (err) {
      console.error(`❌ Failed to update lease ${id}:`, err);
      throw err.response?.data || err;
    }
  },

  /**
   * ✅ Soft delete a lease
   */
  deleteLease: async (id) => {
    try {
      const res = await apiClient.delete(`/leases/${id}`);

      return res.data;
    } catch (err) {
      console.error(`❌ Failed to delete lease ${id}:`, err);
      throw err.response?.data || err;
    }
  },

  /**
   * ✅ Manually trigger expired leases (admin only)
   */
  triggerExpiredLeases: async () => {
    try {
      const res = await apiClient.post(`/leases/trigger-expired`, {});

      return res.data;
    } catch (err) {
      console.error('❌ Failed to trigger expired leases:', err);
      throw err.response?.data || err;
    }
  },

  /**
   * ✅ Download lease PDF report
   */
  downloadPdfReport: async () => {
    try {
      const res = await apiClient.get(`/leases/report/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `lease_report_${new Date().toISOString().split('T')[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Failed to download PDF report:', err);
      throw err.response?.data || err;
    }
  },
};

export default leaseService;
