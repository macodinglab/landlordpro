import { createBrowserRouter } from "react-router-dom";
import * as Layouts from '../layouts';
import * as Pages from '../pages';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layouts.AuthLayouts />,
    children: [
      { index: true, element: <Pages.LoginPage /> },
      { path: 'signup', element: <Pages.SignupPage /> },
      { path: 'forgot-password', element: <Pages.ForgotPassword /> },
      { path: 'reset-password', element: <Pages.ResetPassword /> },
      { path: 'profile', element: <Pages.ProfilePage /> },
      { path: '*', element: <Pages.NotFoundPage /> }
    ]
  },
  {
    path: '/admin',
    element: <Layouts.AdminLayouts />,
    children: [
      { index: true, element: <Pages.AdminDashboard /> },
      { path: '/admin/dashboard', element: <Pages.AdminDashboard /> },
      { path: '/admin/adminUsers', element: <Pages.AdminUsersPage /> },
      { path: '/admin/properties', element: <Pages.PropertyPage /> },
      { path: '/admin/properties/:propertyId/floors', element: <Pages.PropertyFloorsPage /> },
      { path: '/admin/floors', element: <Pages.FloorPage /> },
      { path: '/admin/floors/:floorId/locals', element: <Pages.FloorLocalsPage /> },
      { path: '/admin/locals', element: <Pages.LocalPage /> },
      { path: '/admin/tenants', element: <Pages.TenantPage /> },
      { path: '/admin/leases', element: <Pages.LeasePage /> },
      { path: '/admin/paymentMode', element: <Pages.PaymentModePage /> },
      { path: '/admin/payments', element: <Pages.PaymentPage /> },
      { path: '/admin/expenses', element: <Pages.ExpensePage /> },
      { path: '/admin/staff', element: <Pages.StaffPage /> },
      { path: '/admin/documents', element: <Pages.Documents /> },
      { path: '/admin/reports', element: <Pages.Reports /> },
      { path: '/admin/settings', element: <Pages.AdminSettingsPage /> },
    ]
  },
  {
    path: '/manager',
    element: <Layouts.ManagerLayout />,
    children: [
      { index: true, element: <Pages.ManagerDashboard /> },
      { path: '/manager/properties', element: <Pages.ManagerPropertyPage /> },
      { path: '/manager/leases', element: <Pages.ManagerLeasePage /> },
      { path: '/manager/locals', element: <Pages.ManagerLocalPage /> },
      { path: '/manager/floors', element: <Pages.ManagerFloorPage /> },
      { path: '/manager/tenants', element: <Pages.ManagerTenantPage /> },
      { path: '/manager/payments', element: <Pages.ManagerPaymentPage /> },
      { path: '/manager/expenses', element: <Pages.ManagerExpensePage /> },
      { path: '/manager/reports', element: <Pages.ManagerReportsPage /> },
      { path: '/manager/properties/:propertyId/floors', element: <Pages.ManagerPropertyFloorsPage /> },
      { path: '/manager/floors/:floorId/locals', element: <Pages.ManagerFloorLocalsPage /> },
    ]
  }
]);
