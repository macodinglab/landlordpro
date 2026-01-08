import { useCallback, useEffect, useMemo, useState } from 'react';
import useAccessibleProperties from './useAccessibleProperties';
import { getAllLocals } from '../services/localService';
import leaseService from '../services/leaseService';
import { getAllPayments } from '../services/paymentService';

const dedupeById = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const extractLocals = (response) => {
  if (Array.isArray(response?.locals)) return response.locals;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const extractLeases = (response) => {
  if (!response) return [];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.leases)) return response.leases;
  if (Array.isArray(response)) return response;
  return [];
};

const extractPayments = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const resolveLocalId = (lease) =>
  lease?.localId ??
  lease?.local_id ??
  lease?.local?.id ??
  lease?.local?.local_id ??
  null;

const resolveLeaseId = (payment) =>
  payment?.leaseId ?? payment?.lease_id ?? payment?.lease?.id ?? null;

const resolvePropertyIdFromLease = (lease, localPropertyMap) => {
  if (lease?.propertyId || lease?.property_id) return lease.propertyId || lease.property_id;
  const localId = resolveLocalId(lease);
  if (!localId) return null;
  return localPropertyMap.get(localId) ?? null;
};

const useManagerPortfolio = () => {
  const accessible = useAccessibleProperties();
  const [locals, setLocals] = useState([]);
  const [leases, setLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [floors, setFloors] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    properties,
    propertyOptions,
    accessiblePropertyIds,
    isManager,
    user,
    loading: propertiesLoading,
    error: propertiesError,
    refresh: refreshProperties,
  } = accessible;

  const load = useCallback(async () => {
    if (propertiesLoading) return;

    setPortfolioLoading(true);
    setError(null);

    try {
      const propertyIds = accessiblePropertyIds || [];

      // Fetch locals
      let localsResponses = [];
      if (propertyIds.length > 0) {
        localsResponses = await Promise.all(
          propertyIds.map((propertyId) =>
            getAllLocals({ page: 1, limit: 500, propertyId })
          )
        );
      } else {
        localsResponses = [await getAllLocals({ page: 1, limit: 1000 })];
      }

      const localsCombined = dedupeById(
        localsResponses.flatMap((response) => extractLocals(response)).filter(Boolean)
      );

      const localPropertyMapTemp = new Map(
        localsCombined
          .filter((local) => local?.id)
          .map((local) => [local.id, local.property_id || local.propertyId || null])
      );

      // Fetch leases
      const leasesResponse = await leaseService.getLeases(1, 500);
      const leasesRaw = extractLeases(leasesResponse);

      const leasesWithProperty = dedupeById(
        leasesRaw
          .map((lease) => {
            const propertyId = resolvePropertyIdFromLease(lease, localPropertyMapTemp);
            const localId = resolveLocalId(lease);
            return {
              ...lease,
              propertyId: propertyId || null,
              localId: localId || null,
            };
          })
          .filter((lease) => {
            if (!lease.propertyId) return propertyIds.length === 0;
            if (propertyIds.length === 0) return true;
            return propertyIds.includes(lease.propertyId);
          })
      );

      const leasePropertyMapTemp = new Map(
        leasesWithProperty.map((lease) => [lease.id, lease.propertyId])
      );

      // Fetch payments
      const paymentsResponse = await getAllPayments();
      const paymentsRaw = extractPayments(paymentsResponse);

      const paymentsWithProperty = dedupeById(
        paymentsRaw
          .map((payment) => {
            const leaseId = resolveLeaseId(payment);
            const propertyId =
              payment?.propertyId ||
              payment?.property_id ||
              leasePropertyMapTemp.get(leaseId) ||
              null;

            return {
              ...payment,
              leaseId,
              propertyId,
            };
          })
          .filter((payment) => {
            if (!payment.propertyId) return propertyIds.length === 0;
            if (propertyIds.length === 0) return true;
            return propertyIds.includes(payment.propertyId);
          })
      );

      setLocals(localsCombined);
      setLeases(leasesWithProperty);
      setPayments(paymentsWithProperty);

      // Fetch floors
      let floorsResponse = [];
      if (propertyIds.length > 0) {
        floorsResponse = await Promise.all(
          propertyIds.map((propertyId) =>
            import('../services/floorService').then((module) =>
              module.getFloorsByPropertyId(propertyId)
            )
          )
        );
      }

      const floorsCombined = dedupeById(
        floorsResponse.flatMap((response) => {
          // Handle various response structures as per floorService
          if (response?.data?.floors) return response.data.floors;
          if (response?.floors) return response.floors;
          if (Array.isArray(response)) return response;
          return [];
        }).filter(Boolean)
      );
      setFloors(floorsCombined);
    } catch (err) {
      console.error('Failed to load manager portfolio data:', err);
      setLocals([]);
      setLeases([]);
      setPayments([]);
      setError(err);
    } finally {
      setPortfolioLoading(false);
    }
  }, [accessiblePropertyIds, propertiesLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const localPropertyMap = useMemo(
    () =>
      new Map(
        locals
          .filter((local) => local?.id)
          .map((local) => [local.id, local.property_id || local.propertyId || null])
      ),
    [locals]
  );

  const leasePropertyMap = useMemo(
    () => new Map(leases.map((lease) => [lease.id, lease.propertyId])),
    [leases]
  );

  return {
    user,
    isManager,
    properties,
    propertyOptions,
    accessiblePropertyIds,
    accessiblePropertyIds,
    locals,
    leases,
    payments,
    floors,
    localPropertyMap,
    localPropertyMap,
    leasePropertyMap,
    loading: propertiesLoading || portfolioLoading,
    portfolioLoading,
    propertiesLoading,
    error: error || propertiesError,
    refresh: () => {
      refreshProperties();
      load();
    },
  };
};

export default useManagerPortfolio;

