import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ui/error-boundary'
import NotFound from './components/ui/not-found'
import ProtectedRoute from './components/ui/ProtectedRoute'
import HRProtectedRoute from './components/ui/HRProtectedRoute'
import PEMProtectedRoute from './components/ui/PEMProtectedRoute'
import PMProtectedRoute from './components/ui/PMProtectedRoute'
import SalesProtectedRoute from './components/ui/SalesProtectedRoute'
import EmployeeProtectedRoute from './components/ui/EmployeeProtectedRoute'
import ClientProtectedRoute from './components/ui/ClientProtectedRoute'
import CPProtectedRoute from './components/ui/CPProtectedRoute'
import { ToastProvider } from './contexts/ToastContext'
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService'
import { useEffect } from 'react'

//SL pages start here //
import SL_login from './modules/sells/SL-pages/SL_login'

//Login pages start here //
import Employee_login from './modules/dev/DEV-pages/Employee-pages/Employee_login'
import PM_login from './modules/dev/DEV-pages/PM-pages/PM_login'
import Client_login from './modules/dev/DEV-pages/Client-pages/Client_login'
import Admin_login from './modules/admin/admin-pages/Admin_login'
import CP_login from './modules/channel-partner/CP-pages/CP_login'
import SL_dashboard from './modules/sells/SL-pages/SL_dashboard'
import SL_leads from './modules/sells/SL-pages/SL_leads'
import SL_profile from './modules/sells/SL-pages/SL_profile'
import SL_wallet from './modules/sells/SL-pages/SL_wallet'
import SL_team_management from './modules/sells/SL-pages/SL_team_management'
import SL_newLeads from './modules/sells/SL-pages/SL_newLeads'
import SL_channelPartnerLeads from './modules/sells/SL-pages/SL_channelPartnerLeads'
import SL_channelPartnerLeadProfile from './modules/sells/SL-pages/SL_channelPartnerLeadProfile'
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

//PM pages start here //
import PM_dashboard from './modules/dev/DEV-pages/PM-pages/PM_dashboard'
import PM_projects from './modules/dev/DEV-pages/PM-pages/PM_projects'
import PM_milestone from './modules/dev/DEV-pages/PM-pages/PM_milestone'
import PM_tasks from './modules/dev/DEV-pages/PM-pages/PM_tasks'
import PM_urgent_tasks from './modules/dev/DEV-pages/PM-pages/PM_urgent_tasks'
import PM_urgent_task_detail from './modules/dev/DEV-pages/PM-pages/PM_urgent_task_detail'
import PM_leaderboard from './modules/dev/DEV-pages/PM-pages/PM_leaderboard'
import PM_Profile from './modules/dev/DEV-pages/PM-pages/PM_Profile'
import PM_project_detail from './modules/dev/DEV-pages/PM-pages/PM_project_detail'
import PM_milestone_detail from './modules/dev/DEV-pages/PM-pages/PM_milestone_detail'
import PM_task_detail from './modules/dev/DEV-pages/PM-pages/PM_task_detail'
import PM_wallet from './modules/dev/DEV-pages/PM-pages/PM_wallet'
import PM_new_projects from './modules/dev/DEV-pages/PM-pages/PM_new_projects'
import PM_request from './modules/dev/DEV-pages/PM-pages/PM_request'
import PM_testing_projects from './modules/dev/DEV-pages/PM-pages/PM_testing_projects'
import PM_testing_milestones from './modules/dev/DEV-pages/PM-pages/PM_testing_milestones'

//Employee pages start here //
import Employee_dashboard from './modules/dev/DEV-pages/Employee-pages/Employee_dashboard'
import Employee_leaderboard from './modules/dev/DEV-pages/Employee-pages/Employee_leaderboard'
import Employee_projects from './modules/dev/DEV-pages/Employee-pages/Employee_projects'
import Employee_tasks from './modules/dev/DEV-pages/Employee-pages/Employee_tasks'
import Employee_task_detail from './modules/dev/DEV-pages/Employee-pages/Employee_task_detail'
import Employee_profile from './modules/dev/DEV-pages/Employee-pages/Employee_profile'
import Employee_project_detail from './modules/dev/DEV-pages/Employee-pages/Employee_project_detail'
import Employee_milestone_details from './modules/dev/DEV-pages/Employee-pages/Employee_milestone_details'
import Employee_request from './modules/dev/DEV-pages/Employee-pages/Employee_request'
import PM_notifications from './modules/dev/DEV-pages/PM-pages/PM_notifications'
import PM_notice_board from './modules/dev/DEV-pages/PM-pages/PM_notice_board'
import Employee_notification from './modules/dev/DEV-pages/Employee-pages/Employee_notification'
import Employee_wallet from './modules/dev/DEV-pages/Employee-pages/Employee_wallet'
import Employee_notice_board from './modules/dev/DEV-pages/Employee-pages/Employee_notice_board'
import Employee_my_team from './modules/dev/DEV-pages/Employee-pages/Employee_my_team'
import Employee_team_management from './modules/dev/DEV-pages/Employee-pages/Employee_team_management'

//Client pages start here //
import Client_dashboard from './modules/dev/DEV-pages/Client-pages/Client_dashboard'
import Client_projects from './modules/dev/DEV-pages/Client-pages/Client_projects'
import Client_project_detail from './modules/dev/DEV-pages/Client-pages/Client_project_detail'
import Client_milestone_detail from './modules/dev/DEV-pages/Client-pages/Client_milestone_detail'
import Client_requests from './modules/dev/DEV-pages/Client-pages/Client_request'
import Client_wallet from './modules/dev/DEV-pages/Client-pages/Client_wallet'
import Client_explore from './modules/dev/DEV-pages/Client-pages/Client_explore'
import Client_profile from './modules/dev/DEV-pages/Client-pages/Client_profile'
import Client_notification from './modules/dev/DEV-pages/Client-pages/Client_notification'

//Channel Partner pages start here //
import CP_dashboard from './modules/channel-partner/CP-pages/CP_dashboard.jsx'
import CP_profile from './modules/channel-partner/CP-pages/CP_profile'
import CP_rewards from './modules/channel-partner/CP-pages/CP_rewards'
import CP_leads from './modules/channel-partner/CP-pages/CP_leads'
import CP_lead_details from './modules/channel-partner/CP-pages/CP_lead_details'
import CP_wallet from './modules/channel-partner/CP-pages/CP_wallet'
import CP_converted from './modules/channel-partner/CP-pages/CP_converted'
import CP_shared_leads from './modules/channel-partner/CP-pages/CP_shared_leads'
import CP_received_leads from './modules/channel-partner/CP-pages/CP_received_leads'
import CP_project_progress from './modules/channel-partner/CP-pages/CP_project_progress'
import CP_resources from './modules/channel-partner/CP-pages/CP_resources'
import CP_resource_details from './modules/channel-partner/CP-pages/CP_resource_details'
import CP_quotations from './modules/channel-partner/CP-pages/CP_quotations'
import CP_quotation_details from './modules/channel-partner/CP-pages/CP_quotation_details'
import CP_tutorials from './modules/channel-partner/CP-pages/CP_tutorials'
import CP_tutorial_details from './modules/channel-partner/CP-pages/CP_tutorial_details'
import CP_notice_board from './modules/channel-partner/CP-pages/CP_notice_board'
import CP_my_team from './modules/channel-partner/CP-pages/CP_my_team'
import CP_notifications from './modules/channel-partner/CP-pages/CP_notifications'
import CP_public_profile from './modules/channel-partner/CP-pages/CP_public_profile'
import CP_sales_manager_details from './modules/channel-partner/CP-pages/CP_sales_manager_details'


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
import Admin_channel_partner_management from './modules/admin/admin-pages/Admin_channel_partner_management'
import Admin_client_management from './modules/admin/admin-pages/Admin_client_management'
import Admin_notice_board from './modules/admin/admin-pages/Admin_notice_board'
import Admin_recent_activities from './modules/admin/admin-pages/Admin_recent_activities'
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
              <Route path="/employee-login" element={<Employee_login />} />
              <Route path="/pm-login" element={<PM_login />} />
              <Route path="/client-login" element={<Client_login />} />
              <Route path="/cp-login" element={<CP_login />} />
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
              <Route path="/channel-partner-leads" element={
                <SalesProtectedRoute>
                  <SL_channelPartnerLeads />
                </SalesProtectedRoute>
              } />
              <Route path="/channel-partner-lead-profile/:id" element={
                <SalesProtectedRoute>
                  <SL_channelPartnerLeadProfile />
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
              {/* Public Route - No Protection */}
              <Route path="/p/:id" element={<CP_public_profile />} />

              {/* Admin Routes */}
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

         //PM pages start here //
              <Route path="/pm-dashboard" element={
                <PMProtectedRoute>
                  <PM_dashboard />
                </PMProtectedRoute>
              } />
              <Route path="/pm-projects" element={
                <PMProtectedRoute>
                  <PM_projects />
                </PMProtectedRoute>
              } />
              <Route path="/pm-project/:id" element={
                <PMProtectedRoute>
                  <PM_project_detail />
                </PMProtectedRoute>
              } />
              <Route path="/pm-milestone/:id" element={
                <PMProtectedRoute>
                  <PM_milestone_detail />
                </PMProtectedRoute>
              } />
              <Route path="/pm-task/:id" element={
                <PMProtectedRoute>
                  <PM_task_detail />
                </PMProtectedRoute>
              } />
              <Route path="/pm-milestone" element={
                <PMProtectedRoute>
                  <PM_milestone />
                </PMProtectedRoute>
              } />
              <Route path="/pm-tasks" element={
                <PMProtectedRoute>
                  <PM_tasks />
                </PMProtectedRoute>
              } />
              <Route path="/pm-urgent-tasks" element={
                <PMProtectedRoute>
                  <PM_urgent_tasks />
                </PMProtectedRoute>
              } />
              <Route path="/pm-urgent-task/:id" element={
                <PMProtectedRoute>
                  <PM_urgent_task_detail />
                </PMProtectedRoute>
              } />
              <Route path="/pm-requests" element={
                <PMProtectedRoute>
                  <PM_request />
                </PMProtectedRoute>
              } />
              <Route path="/pm-notifications" element={
                <PMProtectedRoute>
                  <PM_notifications />
                </PMProtectedRoute>
              } />
              <Route path="/pm-notice-board" element={
                <PMProtectedRoute>
                  <PM_notice_board />
                </PMProtectedRoute>
              } />
              <Route path="/pm-leaderboard" element={
                <PMProtectedRoute>
                  <PM_leaderboard />
                </PMProtectedRoute>
              } />
              <Route path="/pm-profile" element={
                <PMProtectedRoute>
                  <PM_Profile />
                </PMProtectedRoute>
              } />
              <Route path="/pm-wallet" element={
                <PMProtectedRoute>
                  <PM_wallet />
                </PMProtectedRoute>
              } />
              <Route path="/pm-new-projects" element={
                <PMProtectedRoute>
                  <PM_new_projects />
                </PMProtectedRoute>
              } />
              <Route path="/pm-testing-projects" element={
                <PMProtectedRoute>
                  <PM_testing_projects />
                </PMProtectedRoute>
              } />
              <Route path="/pm-testing-milestones" element={
                <PMProtectedRoute>
                  <PM_testing_milestones />
                </PMProtectedRoute>
              } />

          //Employee pages start here //
              <Route path="/employee-dashboard" element={
                <EmployeeProtectedRoute>
                  <Employee_dashboard />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-projects" element={
                <EmployeeProtectedRoute>
                  <Employee_projects />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-project/:id" element={
                <EmployeeProtectedRoute>
                  <Employee_project_detail />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee/milestone-details/:id" element={
                <EmployeeProtectedRoute>
                  <Employee_milestone_details />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-notifications" element={
                <EmployeeProtectedRoute>
                  <Employee_notification />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-notice-board" element={
                <EmployeeProtectedRoute>
                  <Employee_notice_board />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-tasks" element={
                <EmployeeProtectedRoute>
                  <Employee_tasks />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-task/:id" element={
                <EmployeeProtectedRoute>
                  <Employee_task_detail />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-requests" element={
                <EmployeeProtectedRoute>
                  <Employee_request />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-leaderboard" element={
                <EmployeeProtectedRoute>
                  <Employee_leaderboard />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-profile" element={
                <EmployeeProtectedRoute>
                  <Employee_profile />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-wallet" element={
                <EmployeeProtectedRoute>
                  <Employee_wallet />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-my-team" element={
                <EmployeeProtectedRoute>
                  <Employee_my_team />
                </EmployeeProtectedRoute>
              } />
              <Route path="/employee-team-management" element={
                <EmployeeProtectedRoute>
                  <Employee_team_management />
                </EmployeeProtectedRoute>
              } />

          //Client pages start here //
              <Route path="/client-dashboard" element={
                <ClientProtectedRoute>
                  <Client_dashboard />
                </ClientProtectedRoute>
              } />
              <Route path="/client-projects" element={
                <ClientProtectedRoute>
                  <Client_projects />
                </ClientProtectedRoute>
              } />
              <Route path="/client-project-detail/:id" element={
                <ClientProtectedRoute>
                  <Client_project_detail />
                </ClientProtectedRoute>
              } />
              <Route path="/client-milestone-detail/:id" element={
                <ClientProtectedRoute>
                  <Client_milestone_detail />
                </ClientProtectedRoute>
              } />
              <Route path="/client-requests" element={
                <ClientProtectedRoute>
                  <Client_requests />
                </ClientProtectedRoute>
              } />
              <Route path="/client-wallet" element={
                <ClientProtectedRoute>
                  <Client_wallet />
                </ClientProtectedRoute>
              } />
              <Route path="/client-explore" element={
                <ClientProtectedRoute>
                  <Client_explore />
                </ClientProtectedRoute>
              } />
              <Route path="/client-profile" element={
                <ClientProtectedRoute>
                  <Client_profile />
                </ClientProtectedRoute>
              } />
              <Route path="/client-notifications" element={
                <ClientProtectedRoute>
                  <Client_notification />
                </ClientProtectedRoute>
              } />

          //Channel Partner pages start here //
              <Route path="/cp-dashboard" element={
                <CPProtectedRoute>
                  <CP_dashboard />
                </CPProtectedRoute>
              } />
              <Route path="/cp-rewards" element={
                <CPProtectedRoute>
                  <CP_rewards />
                </CPProtectedRoute>
              } />
              <Route path="/cp-leads" element={
                <CPProtectedRoute>
                  <CP_leads />
                </CPProtectedRoute>
              } />
              <Route path="/cp-lead-details/:id" element={
                <CPProtectedRoute>
                  <CP_lead_details />
                </CPProtectedRoute>
              } />
              <Route path="/cp-wallet" element={
                <CPProtectedRoute>
                  <CP_wallet />
                </CPProtectedRoute>
              } />
              <Route path="/cp-converted" element={
                <CPProtectedRoute>
                  <CP_converted />
                </CPProtectedRoute>
              } />
              <Route path="/cp-shared-leads" element={
                <CPProtectedRoute>
                  <CP_shared_leads />
                </CPProtectedRoute>
              } />
              <Route path="/cp-received-leads" element={
                <CPProtectedRoute>
                  <CP_received_leads />
                </CPProtectedRoute>
              } />
              <Route path="/cp-project-progress/:id" element={
                <CPProtectedRoute>
                  <CP_project_progress />
                </CPProtectedRoute>
              } />
              <Route path="/cp-resources" element={
                <CPProtectedRoute>
                  <CP_resources />
                </CPProtectedRoute>
              } />
              <Route path="/cp-resources/:id" element={
                <CPProtectedRoute>
                  <CP_resource_details />
                </CPProtectedRoute>
              } />
              <Route path="/cp-quotations" element={
                <CPProtectedRoute>
                  <CP_quotations />
                </CPProtectedRoute>
              } />
              <Route path="/cp-quotation-details/:id" element={
                <CPProtectedRoute>
                  <CP_quotation_details />
                </CPProtectedRoute>
              } />
              <Route path="/cp-tutorials" element={
                <CPProtectedRoute>
                  <CP_tutorials />
                </CPProtectedRoute>
              } />
              <Route path="/cp-tutorial-details/:id" element={
                <CPProtectedRoute>
                  <CP_tutorial_details />
                </CPProtectedRoute>
              } />
              <Route path="/cp-notice-board" element={
                <CPProtectedRoute>
                  <CP_notice_board />
                </CPProtectedRoute>
              } />
              <Route path="/cp-my-team" element={
                <CPProtectedRoute>
                  <CP_my_team />
                </CPProtectedRoute>
              } />
              <Route path="/cp-notifications" element={
                <CPProtectedRoute>
                  <CP_notifications />
                </CPProtectedRoute>
              } />

              <Route path="/cp-profile" element={
                <CPProtectedRoute>
                  <CP_profile />
                </CPProtectedRoute>
              } />
              <Route path="/cp-sales-manager/:id" element={
                <CPProtectedRoute>
                  <CP_sales_manager_details />
                </CPProtectedRoute>
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
                <PEMProtectedRoute>
                  <Admin_project_expenses_management />
                </PEMProtectedRoute>
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
                <HRProtectedRoute>
                  <Admin_hr_management />
                </HRProtectedRoute>
              } />
              <Route path="/admin-channel-partner-management" element={
                <ProtectedRoute>
                  <Admin_channel_partner_management />
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
