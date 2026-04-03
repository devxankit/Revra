import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ui/error-boundary'
import NotFound from './components/ui/not-found'
import ProtectedRoute from './components/ui/ProtectedRoute'
import SalesProtectedRoute from './components/ui/SalesProtectedRoute'
import { ToastProvider } from './contexts/ToastContext'
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService'
import { useEffect } from 'react'

//SL pages start here //
import SL_login from './modules/sells/SL-pages/SL_login'

//Login pages start here //
import Admin_login from './modules/admin/admin-pages/Admin_login'
import SL_dashboard from './modules/sells/SL-pages/SL_dashboard'
import SL_leads from './modules/sells/SL-pages/SL_leads'
import SL_profile from './modules/sells/SL-pages/SL_profile'
import SL_wallet from './modules/sells/SL-pages/SL_wallet'
import SL_team_management from './modules/sells/SL-pages/SL_team_management'
import SL_newLeads from './modules/sells/SL-pages/SL_newLeads'
import SL_connected from './modules/sells/SL-pages/SL_connected'
import SL_leadProfile from './modules/sells/SL-pages/SL_leadProfile'
import SL_ClientProfile from './modules/sells/SL-pages/SL_ClientProfile'
import SL_ClientTransaction from './modules/sells/SL-pages/SL_ClientTransaction'
import SL_client_transaction from './modules/sells/SL-pages/SL_client_transaction'
import SL_notes from './modules/sells/SL-pages/SL_notes'
import SL_payments_recovery from './modules/sells/SL-pages/SL_payments_recovery'
import SL_demo_request from './modules/sells/SL-pages/SL_demo_request'
import SL_tasks from './modules/sells/SL-pages/SL_tasks'
import SL_meetings from './modules/sells/SL-pages/SL_meetings'
import SL_hot_leads from './modules/sells/SL-pages/SL_hot_leads'
import SL_converted from './modules/sells/SL-pages/SL_converted'
import SL_not_picked from './modules/sells/SL-pages/SL_not_picked'
import SL_followup from './modules/sells/SL-pages/SL_followup'
import SL_quotation_sent from './modules/sells/SL-pages/SL_quotation_sent'
import SL_demo_sent from './modules/sells/SL-pages/SL_demo_sent'
import SL_lost from './modules/sells/SL-pages/SL_lost'
import SL_notification from './modules/sells/SL-pages/SL_notification'
import SL_requests from './modules/sells/SL-pages/SL_requests'
import SL_notice_board from './modules/sells/SL-pages/SL_notice_board'

//Admin pages start here //
import Admin_dashboard from './modules/admin/admin-pages/Admin_dashboard'
import Admin_project_management from './modules/admin/admin-pages/Admin_project_management'
import Admin_finance_management from './modules/admin/admin-pages/Admin_finance_management'
import Admin_leaderboard from './modules/admin/admin-pages/Admin_leaderboard'
import Admin_reward_management from './modules/admin/admin-pages/Admin_reward_management'
import Admin_requests_management from './modules/admin/admin-pages/Admin_requests_management'
import Admin_sales_management from './modules/admin/admin-pages/Admin_sales_management'
import Admin_profile from './modules/admin/admin-pages/Admin_profile'
import Admin_user_management from './modules/admin/admin-pages/Admin_user_management'
import Admin_hr_management from './modules/admin/admin-pages/Admin_hr_management'
import Admin_client_management from './modules/admin/admin-pages/Admin_client_management'
import Admin_notice_board from './modules/admin/admin-pages/Admin_notice_board'
import Admin_recent_activities from './modules/admin/admin-pages/Admin_recent_activities'
import Admin_insurance_management from './modules/admin/admin-pages/Admin_insurance_management'
import Admin_project_expenses_management from './modules/admin/admin-pages/Admin_project_expenses_management'
import Admin_settings from './modules/admin/admin-pages/Admin_settings'
import ResetPassword from './components/auth/ResetPassword'
import RootRedirect from './components/auth/RootRedirect'
import { AdminSidebarProvider } from './modules/admin/admin-contexts/AdminSidebarContext'

function App() {
  useEffect(() => {
    // Initialize push notifications on app load
    initializePushNotifications();

    // Setup foreground notification handler
    setupForegroundNotificationHandler((payload) => {
      if (payload.data?.link) {
        // Navigate to link
        window.location.href = payload.data.link;
      }
    });
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AdminSidebarProvider>
          <Router>
            <Routes>
          //Login pages start here //
              <Route path="/" element={<RootRedirect />} />
              <Route path="/sales-login" element={<SL_login />} />
              <Route path="/admin-login" element={<Admin_login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

          //SL pages start here //
              <Route path="/dashboard" element={
                <SalesProtectedRoute>
                  <SL_dashboard />
                </SalesProtectedRoute>
              } />
              <Route path="/leads" element={
                <SalesProtectedRoute>
                  <SL_leads />
                </SalesProtectedRoute>
              } />
              <Route path="/wallet" element={
                <SalesProtectedRoute>
                  <SL_wallet />
                </SalesProtectedRoute>
              } />
              <Route path="/new-leads" element={
                <SalesProtectedRoute>
                  <SL_newLeads />
                </SalesProtectedRoute>
              } />
              <Route path="/connected" element={
                <SalesProtectedRoute>
                  <SL_connected />
                </SalesProtectedRoute>
              } />
              <Route path="/lead-profile/:id" element={
                <SalesProtectedRoute>
                  <SL_leadProfile />
                </SalesProtectedRoute>
              } />
              <Route path="/client-profile/:id" element={
                <SalesProtectedRoute>
                  <SL_ClientProfile />
                </SalesProtectedRoute>
              } />
              <Route path="/client-transaction/:id" element={
                <SalesProtectedRoute>
                  <SL_ClientTransaction />
                </SalesProtectedRoute>
              } />
              <Route path="/client-notes/:id" element={
                <SalesProtectedRoute>
                  <SL_notes />
                </SalesProtectedRoute>
              } />

              <Route path="/payments-recovery" element={
                <SalesProtectedRoute>
                  <SL_payments_recovery />
                </SalesProtectedRoute>
              } />
              <Route path="/demo-requests" element={
                <SalesProtectedRoute>
                  <SL_demo_request />
                </SalesProtectedRoute>
              } />
              <Route path="/tasks" element={
                <SalesProtectedRoute>
                  <SL_tasks />
                </SalesProtectedRoute>
              } />
              <Route path="/meetings" element={
                <SalesProtectedRoute>
                  <SL_meetings />
                </SalesProtectedRoute>
              } />
              <Route path="/hot-leads" element={
                <SalesProtectedRoute>
                  <SL_hot_leads />
                </SalesProtectedRoute>
              } />
              <Route path="/converted" element={
                <SalesProtectedRoute>
                  <SL_converted />
                </SalesProtectedRoute>
              } />
              <Route path="/my-team" element={
                <SalesProtectedRoute>
                  <SL_team_management />
                </SalesProtectedRoute>
              } />
              <Route path="/not-picked" element={
                <SalesProtectedRoute>
                  <SL_not_picked />
                </SalesProtectedRoute>
              } />
              <Route path="/followup" element={
                <SalesProtectedRoute>
                  <SL_followup />
                </SalesProtectedRoute>
              } />
              <Route path="/quotation-sent" element={
                <SalesProtectedRoute>
                  <SL_quotation_sent />
                </SalesProtectedRoute>
              } />
              <Route path="/demo-sent" element={
                <SalesProtectedRoute>
                  <SL_demo_sent />
                </SalesProtectedRoute>
              } />
              <Route path="/lost" element={
                <SalesProtectedRoute>
                  <SL_lost />
                </SalesProtectedRoute>
              } />
              <Route path="/profile" element={
                <SalesProtectedRoute>
                  <SL_profile />
                </SalesProtectedRoute>
              } />
              <Route path="/notifications" element={
                <SalesProtectedRoute>
                  <SL_notification />
                </SalesProtectedRoute>
              } />
              <Route path="/requests" element={
                <SalesProtectedRoute>
                  <SL_requests />
                </SalesProtectedRoute>
              } />
              <Route path="/notice-board" element={
                <SalesProtectedRoute>
                  <SL_notice_board />
                </SalesProtectedRoute>
              } />

          //Admin pages start here //
              <Route path="/admin-dashboard" element={
                <ProtectedRoute>
                  <Admin_dashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin-project-management" element={
                <ProtectedRoute>
                  <Admin_project_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-finance-management" element={
                <ProtectedRoute>
                  <Admin_finance_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-project-expenses-management" element={
                <ProtectedRoute>
                  <Admin_project_expenses_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-leaderboard" element={
                <ProtectedRoute>
                  <Admin_leaderboard />
                </ProtectedRoute>
              } />
              <Route path="/admin-reward-management" element={
                <ProtectedRoute>
                  <Admin_reward_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-insurance-management" element={
                <ProtectedRoute>
                  <Admin_insurance_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-requests-management" element={
                <ProtectedRoute>
                  <Admin_requests_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-sales-management" element={
                <ProtectedRoute>
                  <Admin_sales_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-user-management" element={
                <ProtectedRoute>
                  <Admin_user_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-hr-management" element={
                <ProtectedRoute>
                  <Admin_hr_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-client-management" element={
                <ProtectedRoute>
                  <Admin_client_management />
                </ProtectedRoute>
              } />
              <Route path="/admin-notice-board" element={
                <ProtectedRoute>
                  <Admin_notice_board />
                </ProtectedRoute>
              } />
              <Route path="/admin-recent-activities" element={
                <ProtectedRoute>
                  <Admin_recent_activities />
                </ProtectedRoute>
              } />
              <Route path="/admin-profile" element={
                <ProtectedRoute>
                  <Admin_profile />
                </ProtectedRoute>
              } />
              <Route path="/admin-settings" element={
                <ProtectedRoute requiredRole="admin">
                  <Admin_settings />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AdminSidebarProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
