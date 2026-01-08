import { useSelector } from 'react-redux';

export default function useCurrentUser() {
  const reduxUser = useSelector((state) => state.user?.user);
  const storedUser = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user')) || {}
    : {};

  const currentUser = reduxUser || storedUser || {};
  const role = currentUser.role || '';
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';

  const isAdmin = normalizedRole === 'admin';
  const isManager = normalizedRole === 'manager';

  return { currentUser, isAdmin, isManager };
}
