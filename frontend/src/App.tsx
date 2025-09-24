import { Routes, Route } from 'react-router-dom'
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
// import TeeTimeReport from '@/pages/TeeTimeReport' // File removed
import MobileScorecard from '@/pages/MobileScorecard'
import ManualScorecardEntry from '@/pages/ManualScorecardEntry'
import ScorecardPlayerSelection from '@/pages/ScorecardPlayerSelection'
import ScorecardHistory from '@/pages/ScorecardHistory'
import ScorecardDetail from '@/pages/ScorecardDetail'
import PrintableScorecard from '@/pages/PrintableScorecard'
import HolesManagement from '@/pages/HolesManagement'
import TeesManagement from '@/pages/TeesManagement'
import TournamentResults from '@/pages/TournamentResults'


function App() {
  return (
    <Routes>
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
      
      {/* Reporte de Tee Times - Removed */}
      {/* <Route path="/club/:clubId/tournaments/:tournamentId/tee-times/report" element={<TeeTimeReport />} /> */}
      
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
      

    </Routes>
  )
}

export default App
