import axios from 'axios';
import { Participant, PlayerSearchResult } from '@/types/participant';
import type { ExternalPlayerRegistry } from '@/types/externalPlayer';

const API_URL = '/api/club';

/** Origen público del sitio (https://host). En producción: VITE_PUBLIC_APP_URL; si no, `window.location.origin`. */
export function getPublicAppOrigin(): string {
  const raw = String(import.meta.env.VITE_PUBLIC_APP_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  if (raw && /^https?:\/\//i.test(raw)) return raw
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export const getTournamentParticipants = async (clubId: number, tournamentId: number): Promise<Participant[]> => {
  const response = await axios.get(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants`);
  const participants = response.data.data;
  
  // Mapear los datos para asegurar que tengan la estructura correcta
  return participants.map((participant: any) => ({
    ...participant,
    participant_id: participant.participation_id || participant.participant_id,
    // member_number ya viene correcto del backend, solo asegurar que no sea undefined
    member_number: participant.member_number || null,
  }));
};

export const addTournamentParticipant = async (
  clubId: number,
  tournamentId: number,
  participantData: any
): Promise<Participant> => {
  const response = await axios.post(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants`, participantData);
  return response.data.data;
};

export const removeTournamentParticipant = async (
  clubId: number, 
  tournamentId: number, 
  participantId: number
): Promise<void> => {
  await axios.delete(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`);
};

export const updateParticipantStatus = async (
  clubId: number, 
  tournamentId: number, 
  participantId: number, 
  status: Participant['status']
): Promise<Participant[]> => {
  const response = await axios.patch(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`, { status });
  return response.data.data;
};

export const updateParticipantHandicap = async (
  clubId: number,
  tournamentId: number,
  participantId: number,
  data: { handicap_index?: number | null; handicap_local?: number | null }
): Promise<Participant[]> => {
  const response = await axios.put(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`,
    data
  );
  return response.data.data;
};

/** Actualiza el turno (Mañana/Tarde) del participante */
export const updateParticipantTeePreference = async (
  clubId: number,
  tournamentId: number,
  participantId: number,
  preferred_session: 'morning' | 'afternoon' | null
): Promise<Participant[]> => {
  const response = await axios.put(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`,
    { preferred_session }
  );
  return response.data.data;
};

/** Obtiene la URL de WhatsApp para enviar confirmación de inscripción al jugador */
export const getParticipantWhatsAppInscriptionUrl = async (
  clubId: number,
  tournamentId: number,
  participantId: number
): Promise<{ whatsappUrl: string }> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/whatsapp-inscription`
  );
  return { whatsappUrl: response.data.whatsappUrl };
};

/** Obtiene la URL de WhatsApp para enviar confirmación de pago al jugador */
export const getParticipantWhatsAppPaymentUrl = async (
  clubId: number,
  tournamentId: number,
  participantId: number
): Promise<{ whatsappUrl: string }> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/whatsapp-payment`
  );
  return { whatsappUrl: response.data.whatsappUrl };
};

/** Datos para impresión en plancha física (overlay), sin tarjeta de scores */
export const getParticipantPhysicalPrintData = async (
  clubId: number,
  tournamentId: number,
  participantId: number
): Promise<Record<string, unknown>> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/physical-print`
  );
  return response.data.data;
};

/** Misma forma que getParticipantPhysicalPrintData, para socio o externo aún no inscripto en el torneo. */
export const getPhysicalPrintPreviewData = async (
  clubId: number,
  tournamentId: number,
  opts: { memberId?: number; externalPlayerId?: number }
): Promise<Record<string, unknown>> => {
  const params = new URLSearchParams();
  if (opts.memberId != null && opts.memberId > 0) params.set('memberId', String(opts.memberId));
  if (opts.externalPlayerId != null && opts.externalPlayerId > 0) params.set('externalPlayerId', String(opts.externalPlayerId));
  const response = await axios.get(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/physical-print-preview?${params.toString()}`
  );
  return response.data.data;
};

/** Plancha desde gestión de socios: sin nombre de torneo; la fecha debe fijarse en el cliente (día de impresión). */
export const getMemberPhysicalPrintClubListingData = async (
  clubId: number,
  memberId: number
): Promise<Record<string, unknown>> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/members/physical-print-club-listing?memberId=${memberId}`
  );
  return response.data.data;
};

/** Igual que socios en listado global: sin torneo; fecha = día de impresión en el cliente. */
export const getExternalPhysicalPrintClubListingData = async (
  clubId: number,
  externalPlayerId: number
): Promise<Record<string, unknown>> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/external-players/physical-print-club-listing?externalPlayerId=${externalPlayerId}`
  );
  return response.data.data;
};

export const updateParticipantPayment = async (
  clubId: number,
  tournamentId: number,
  participantId: number,
  paymentData: {
    fee_amount?: number
    paid_amount?: number
    payment_status?: 'pending' | 'paid' | 'waived'
    payment_method?: string
    receipt_number?: string
    payment_notes?: string
  }
): Promise<void> => {
  await axios.put(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/payment`, paymentData);
};

/** Genera código PIN para cobros móvil (requiere sesión admin: Bearer clubToken) */
export const generateMobilePaymentsPin = async (
  clubId: number,
  tournamentId: number
): Promise<{ pin: string; expiresInSeconds: number }> => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('clubToken') : null;
  const response = await axios.post(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/mobile-payments-pin`,
    {},
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return {
    pin: response.data.pin,
    expiresInSeconds: response.data.expiresInSeconds
  };
};

/** Intercambia PIN por sesión de cobros móvil (público, sin login admin) */
export const verifyMobilePaymentsPin = async (
  clubId: number,
  tournamentId: number,
  pin: string
): Promise<{ sessionToken: string; expiresInSeconds: number }> => {
  const response = await axios.post(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/mobile-payments-pin/verify`,
    { pin }
  );
  return {
    sessionToken: response.data.sessionToken,
    expiresInSeconds: response.data.expiresInSeconds
  };
};
export const searchPlayersForTournament = async (clubId: number, query: string): Promise<PlayerSearchResult[]> => {
  if (!query || query.length < 2) {
    return [];
  }
  const response = await axios.get(`${API_URL}/${clubId}/search-players?q=${encodeURIComponent(query)}`);
  return response.data.data;
};

export const checkDuplicateExternalPlayers = async (clubId: number, playerData: any): Promise<any> => {
  const response = await axios.post(`${API_URL}/${clubId}/external-players/check-duplicates`, playerData);
  return response.data.data;
};

export const createExternalPlayer = async (clubId: number, playerData: any): Promise<any> => {
  const response = await axios.post(`${API_URL}/${clubId}/external-players`, playerData);
  return response.data.data;
};

export const getExternalPlayers = async (clubId: number): Promise<PlayerSearchResult[]> => {
  const response = await axios.get(`${API_URL}/${clubId}/external-players`);
  return response.data.data;
};

/** Solo registros de `external_players` (con columnas AAG) para gestión administrativa */
export const getExternalPlayersRegistry = async (clubId: number): Promise<ExternalPlayerRegistry[]> => {
  const response = await axios.get(`${API_URL}/${clubId}/external-players/registry`);
  return response.data.data;
};

export const updateExternalPlayer = async (clubId: number, playerId: number, playerData: any): Promise<any> => {
  const response = await axios.put(`${API_URL}/${clubId}/external-players/${playerId}`, playerData);
  return response.data.data;
};

export const deleteExternalPlayer = async (clubId: number, playerId: number): Promise<void> => {
  await axios.delete(`${API_URL}/${clubId}/external-players/${playerId}`);
};