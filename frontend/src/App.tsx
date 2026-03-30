import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DashboardSimple as Dashboard } from '@/pages/DashboardSimple'
import { ClubsManagement } from '@/pages/ClubsManagement'

import { Administrators } from '@/pages/Administrators'
import { Subscriptions } from '@/pages/Subscriptions'
import { Reports } from '@/pages/Reports'
import { Configuration } from '@/pages/Configuration'
import { Login } from '@/pages/Login'
import { ClubAdmin } from '@/pages/ClubAdmin'

import TeeTimeManagerSimple from '@/pages/TeeTimeManagerSimple'
import MobileScorecard from '@/pages/MobileScorecard'
import ManualScorecardEntry from '@/pages/ManualScorecardEntry'
import ScorecardPlayerSelection from '@/pages/ScorecardPlayerSelection'
import ScorecardHistory from '@/pages/ScorecardHistory'
import ScorecardDetail from '@/pages/ScorecardDetail'
import PrintableScorecard from '@/pages/PrintableScorecard'
import HolesManagement from '@/pages/HolesManagement'
import TeesManagement from '@/pages/TeesManagement'
import TournamentResults from '@/pages/TournamentResults'
import Rankings from '@/pages/Rankings'
import ExternalPlayers from '@/pages/ExternalPlayers'
import Payments from '@/pages/Payments'
import PublicFinancialReport from '@/pages/PublicFinancialReport'
import PublicInscription from '@/pages/PublicInscription'
import TournamentMobilePayments from '@/pages/TournamentMobilePayments'

// Componente para redirigir /club/:clubId a /club/:clubId/admin
function ClubRedirect() {
  const { clubId } = useParams<{ clubId: string }>()
  console.log('ClubRedirect - clubId recibido:', clubId)
  if (!clubId || clubId === ':clubId') {
    console.error('ClubRedirect - clubId inválido, redirigiendo al login')
    return <Navigate to="/login" replace />
  }
  return <Navigate to={`/club/${clubId}/admin`} replace />
}

/** QR o link cortados en .../tournaments/:id (sin mobile-payments) → cobro móvil con PIN */
function RedirectTournamentHubToCobroMovil() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>()
  return <Navigate to={`/c/${clubId}/t/${tournamentId}/cobro?reiniciar=1`} replace />
}

function App() {
  return (
    <Routes>
      {/* Rutas públicas SIN login: deben ir antes que Layout y antes del catch-all */}
      <Route path="/club/:clubId/torneo/:tournamentId/inscribirse" element={<PublicInscription />} />
      {/* URL corta para QR (menos errores al escanear); misma pantalla que mobile-payments */}
      <Route path="/c/:clubId/t/:tournamentId/cobro" element={<TournamentMobilePayments />} />
      <Route path="/club/:clubId/tournaments/:tournamentId/mobile-payments" element={<TournamentMobilePayments />} />
      
      {/* Sistema de administración principal */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clubs" element={<ClubsManagement />} />
        <Route path="system/holes/:clubId" element={<HolesManagement />} />
        <Route path="system/tees/:clubId" element={<TeesManagement />} />
        <Route path="administrators" element={<Administrators />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="configuration" element={<Configuration />} />
      </Route>
      
      {/* Login para administradores de club */}
      <Route path="/login" element={<Login />} />
      
      {/* Administración individual de clubes */}
      <Route path="/club/:clubId/admin" element={<ClubAdmin />} />
      
      {/* Gestión de hoyos */}
      <Route path="/club/:clubId/holes" element={<HolesManagement />} />
      
      {/* Gestión de Tee Times */}
      <Route path="/club/:clubId/tournaments/:tournamentId/tee-times" element={<TeeTimeManagerSimple />} />
      
      {/* Scorecard móvil */}
      <Route path="/club/:clubId/tournaments/:tournamentId/mobile/:playerId" element={<MobileScorecard />} />
      
      {/* Selección de jugador para carga manual */}
      <Route path="/club/:clubId/tournaments/:tournamentId/scorecard-selection" element={<ScorecardPlayerSelection />} />
      
      {/* Carga manual de tarjetas (con jugador seleccionado) */}
      <Route path="/club/:clubId/tournaments/:tournamentId/manual-entry/:playerId" element={<ManualScorecardEntry />} />
      
      {/* Historial de tarjetas */}
      <Route path="/club/:clubId/tournaments/:tournamentId/scorecards" element={<ScorecardHistory />} />
      
      {/* Detalle de tarjeta */}
      <Route path="/club/:clubId/tournaments/:tournamentId/scorecard/:scorecardId" element={<ScorecardDetail />} />
      
      {/* Tarjeta imprimible */}
      <Route path="/club/:clubId/tournaments/:tournamentId/scorecard/:scorecardId/print" element={<PrintableScorecard />} />
      
      {/* Resultados finales por categorías */}
      <Route path="/club/:clubId/tournaments/:tournamentId/results" element={<TournamentResults />} />

      {/* Solo club + torneo (sin subruta): compat. links/QR truncados → cobro móvil */}
      <Route path="/club/:clubId/tournaments/:tournamentId" element={<RedirectTournamentHubToCobroMovil />} />
      
      {/* Rankings del club */}
      <Route path="/club/:clubId/rankings" element={<Rankings />} />

      {/* Jugadores externos (gestión) */}
      <Route path="/club/:clubId/external-players" element={<ExternalPlayers />} />
      
      {/* Contabilidad del club (incluye cobros) */}
      <Route path="/club/:clubId/accounting" element={<Payments />} />
      {/* Compatibilidad: ruta anterior de cobros */}
      <Route path="/club/:clubId/payments" element={<Payments />} />
      
      {/* Informe contable público para socios */}
      <Route path="/club/:clubId/informe-contable" element={<PublicFinancialReport />} />

      {/* Compatibilidad: si entran a /club/:clubId (sin /admin), redirige al admin */}
      <Route path="/club/:clubId" element={<ClubRedirect />} />
      
      {/* Ruta catch-all: redirigir al login si no hay ruta coincidente */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  )
}

export default App
