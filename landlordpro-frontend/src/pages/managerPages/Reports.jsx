import React from 'react';
import ReportsPage from '../adminPages/ReportsPage';
import useAccessibleProperties from '../../hooks/useAccessibleProperties';

const ManagerReportsPage = () => {
  const { propertyOptions, accessiblePropertyIds, loading } = useAccessibleProperties();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-teal-400 text-lg animate-pulse">Loading reports...</div>
      </div>
    );
  }

  // Default to the first accessible property if available
  const defaultPropertyId = accessiblePropertyIds?.[0] || null;

  return (
    <ReportsPage
      propertyId={defaultPropertyId}
      propertyOptions={propertyOptions}
    />
  );
};

export default ManagerReportsPage;
