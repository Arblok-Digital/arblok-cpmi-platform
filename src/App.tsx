import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { HomeRedirect, RequireAuth, RoleGate } from '@/app/route-guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { AgentDashboard } from '@/features/dashboard/AgentDashboard'
import { P3miDashboard } from '@/features/dashboard/P3miDashboard'
import { CpmiDashboard } from '@/features/dashboard/CpmiDashboard'
import { AdminDashboard } from '@/features/dashboard/AdminDashboard'
import { NewReferralPage } from '@/features/referrals/NewReferralPage'
import { ReferralInboxPage } from '@/features/referrals/ReferralInboxPage'
import { P3miReferralDetailPage } from '@/features/referrals/P3miReferralDetailPage'
import { AgentCandidateListPage } from '@/features/candidates/AgentCandidateListPage'
import { AgentCandidateDetailPage } from '@/features/candidates/AgentCandidateDetailPage'
import { P3miCandidateListPage } from '@/features/candidates/P3miCandidateListPage'
import { P3miCandidateDetailPage } from '@/features/candidates/P3miCandidateDetailPage'
import { PipelineBoardPage } from '@/features/candidates/PipelineBoardPage'
import { P3miDocumentsPage } from '@/features/documents/P3miDocumentsPage'
import { CpmiDocumentsPage } from '@/features/documents/CpmiDocumentsPage'
import { VisitsPage } from '@/features/operations/VisitsPage'
import { AgentCommissionPage } from '@/features/commission/AgentCommissionPage'
import { P3miFeePage } from '@/features/commission/P3miFeePage'
import { P3miComplaintsPage } from '@/features/complaints/P3miComplaintsPage'
import { SupportPage } from '@/features/complaints/SupportPage'
import { AgentNetworkPage } from '@/features/network/AgentNetworkPage'
import { CoordinatorNetworkPage } from '@/features/network/CoordinatorNetworkPage'
import { OrganizationsPage } from '@/features/admin/OrganizationsPage'
import { PlatformNetworkPage } from '@/features/admin/PlatformNetworkPage'
import { AuditPage } from '@/features/admin/AuditPage'
import { ConfigPage } from '@/features/admin/ConfigPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { P3miSettingsPage } from '@/features/settings/P3miSettingsPage'
import { P3miVacancyPage } from '@/features/operations/P3miVacancyPage'
import { P3miAgentAgreementPage } from '@/features/operations/P3miAgentAgreementPage'
import { AccountPage } from '@/features/account/AccountPage'
import { CpmiDataPage } from '@/features/cpmi/CpmiDataPage'
import { CpmiProgressPage } from '@/features/cpmi/CpmiProgressPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { NotFoundPage } from '@/features/misc/NotFoundPage'

const P3MI_ROLES = ['p3mi_admin', 'p3mi_reviewer'] as const
const AGENT_ROLES = ['agent', 'agent_coordinator'] as const

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route
            path="/p3mi"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miDashboard />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/referral"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <ReferralInboxPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/referral/:id"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miReferralDetailPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/kandidat"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miCandidateListPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/kandidat/:id"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miCandidateDetailPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/pipeline"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <PipelineBoardPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/dokumen"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miDocumentsPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/kunjungan"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <VisitsPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/fee"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miFeePage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/pengaduan"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miComplaintsPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/agen"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <AgentNetworkPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/laporan"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <ReportsPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/pengaturan"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miSettingsPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/lowongan"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miVacancyPage />
              </RoleGate>
            }
          />
          <Route
            path="/p3mi/perjanjian-agen"
            element={
              <RoleGate roles={[...P3MI_ROLES]}>
                <P3miAgentAgreementPage />
              </RoleGate>
            }
          />

          <Route
            path="/agen"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <AgentDashboard />
              </RoleGate>
            }
          />
          <Route
            path="/agen/referral/baru"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <NewReferralPage />
              </RoleGate>
            }
          />
          <Route
            path="/agen/kandidat"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <AgentCandidateListPage />
              </RoleGate>
            }
          />
          <Route
            path="/agen/kandidat/:id"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <AgentCandidateDetailPage />
              </RoleGate>
            }
          />
          <Route
            path="/agen/komisi"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <AgentCommissionPage />
              </RoleGate>
            }
          />
          <Route
            path="/agen/jaringan"
            element={
              <RoleGate roles={['agent_coordinator']}>
                <CoordinatorNetworkPage />
              </RoleGate>
            }
          />
          <Route
            path="/agen/bantuan"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <SupportPage />
              </RoleGate>
            }
          />
          <Route
            path="/agen/akun"
            element={
              <RoleGate roles={[...AGENT_ROLES]}>
                <AccountPage />
              </RoleGate>
            }
          />

          <Route
            path="/cpmi"
            element={
              <RoleGate roles={['cpmi']}>
                <CpmiDashboard />
              </RoleGate>
            }
          />
          <Route
            path="/cpmi/data"
            element={
              <RoleGate roles={['cpmi']}>
                <CpmiDataPage />
              </RoleGate>
            }
          />
          <Route
            path="/cpmi/dokumen"
            element={
              <RoleGate roles={['cpmi']}>
                <CpmiDocumentsPage />
              </RoleGate>
            }
          />
          <Route
            path="/cpmi/perkembangan"
            element={
              <RoleGate roles={['cpmi']}>
                <CpmiProgressPage />
              </RoleGate>
            }
          />
          <Route
            path="/cpmi/bantuan"
            element={
              <RoleGate roles={['cpmi']}>
                <SupportPage />
              </RoleGate>
            }
          />

          <Route
            path="/platform"
            element={
              <RoleGate roles={['arblok_admin']}>
                <AdminDashboard />
              </RoleGate>
            }
          />
          <Route
            path="/platform/organisasi"
            element={
              <RoleGate roles={['arblok_admin']}>
                <OrganizationsPage />
              </RoleGate>
            }
          />
          <Route
            path="/platform/jaringan"
            element={
              <RoleGate roles={['arblok_admin']}>
                <PlatformNetworkPage />
              </RoleGate>
            }
          />
          <Route
            path="/platform/audit"
            element={
              <RoleGate roles={['arblok_admin']}>
                <AuditPage />
              </RoleGate>
            }
          />
          <Route
            path="/platform/konfigurasi"
            element={
              <RoleGate roles={['arblok_admin']}>
                <ConfigPage />
              </RoleGate>
            }
          />

          <Route path="/notifikasi" element={<NotificationsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
