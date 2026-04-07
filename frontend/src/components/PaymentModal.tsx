import { useState, useEffect } from 'react'
import { X, DollarSign } from 'lucide-react'
import { Participant } from '@/types/participant'
import { useUpdateParticipantPayment } from '@/hooks/useParticipants'
import { getParticipantWhatsAppPaymentUrl } from '@/services/participantService'
import { toast } from 'react-hot-toast'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  participant: Participant | null
  clubId: number
  tournamentId: number
  defaultFee?: number
  onSaved?: () => void
}

export function PaymentModal({ isOpen, onClose, participant, clubId, tournamentId, defaultFee = 0, onSaved }: PaymentModalProps) {
  const updatePayment = useUpdateParticipantPayment(clubId, tournamentId)
  // Usar strings para permitir campo vacío
  const [feeAmount, setFeeAmount] = useState<string>('')
  const [paidAmount, setPaidAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('ARS')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'waived'>('pending')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [receiptNumber, setReceiptNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (participant) {
      // Arancel guardado en el participante (incluye 0 explícito). Solo si no hay dato en BD, usar el del torneo.
      const rawFee = participant.fee_amount
      let initialFee: number
      if (rawFee === undefined || rawFee === null) {
        initialFee = defaultFee ?? 0
      } else {
        const n = Number(rawFee)
        initialFee = Number.isFinite(n) ? n : (defaultFee ?? 0)
      }
      setFeeAmount(String(initialFee))
      setPaidAmount(
        participant.paid_amount !== undefined && participant.paid_amount !== null
          ? String(participant.paid_amount)
          : (participant.payment_status === 'paid'
              ? String(participant.fee_amount ?? defaultFee ?? '')
              : '')
      )
      setCurrency((participant as any).currency || 'ARS')
      setPaymentStatus((participant.payment_status as any) || 'pending')
      setPaymentMethod(participant.payment_method || '')
      setReceiptNumber(participant.receipt_number || '')
      setNotes(participant.payment_notes || '')
    }
  }, [participant, defaultFee])

  // Actualizar monto pagado automáticamente cuando cambia el estado
  useEffect(() => {
    if (paymentStatus === 'paid') {
      // Si cambia a "Pagado", llenar con el arancel
      const feeNumeric = feeAmount !== '' ? Number(feeAmount) : (defaultFee ?? 0)
      setPaidAmount(String(feeNumeric))
    } else if (paymentStatus === 'pending') {
      // Si cambia a "Pendiente", poner en 0 y resetear método de pago
      setPaidAmount('0')
      setPaymentMethod('')
      setReceiptNumber('')
    } else if (paymentStatus === 'waived') {
      setPaidAmount('0')
      setPaymentMethod('')
      setReceiptNumber('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus])

  if (!isOpen || !participant) return null

  const handleSave = async () => {
    // Validaciones: si va a "paid", exigir método y calcular pagado = arancel (o defaultFee)
    if (paymentStatus === 'paid' && !paymentMethod) {
      alert('Seleccioná la forma de pago.')
      return
    }

    const feeNumeric = feeAmount !== '' ? Number(feeAmount) : (defaultFee ?? 0)
    
    // Determinar monto pagado según el estado
    let paidNumeric: number
    if (paymentStatus === 'paid') {
      // Si está pagado, el monto pagado = arancel
      paidNumeric = feeNumeric
    } else if (paymentStatus === 'pending') {
      // Si está pendiente, el monto pagado = 0
      paidNumeric = 0
    } else {
      // Para otros estados (waived), usar el valor ingresado
      paidNumeric = paidAmount !== '' ? Number(paidAmount) : 0
    }

    const payload: any = {
      payment_status: paymentStatus,
      fee_amount: feeNumeric,
      paid_amount: paidNumeric,
      currency: currency
    }
    if (paymentStatus === 'paid' && paymentMethod) payload.payment_method = paymentMethod
    if (paymentStatus !== 'waived' && receiptNumber) payload.receipt_number = receiptNumber
    if (notes) payload.payment_notes = notes

    try {
      await updatePayment.mutateAsync({
        participantId: participant.participant_id,
        paymentData: payload
      })
    } catch {
      // El hook useUpdateParticipantPayment ya muestra el error del API
      return
    }
    onSaved?.()
    if (paymentStatus === 'paid') {
      try {
        const { whatsappUrl } = await getParticipantWhatsAppPaymentUrl(clubId, tournamentId, participant.participant_id)
        window.open(whatsappUrl, '_blank')
        toast.success('Se abrió WhatsApp para enviar la confirmación de pago al jugador')
      } catch (e: any) {
        toast.error(e.response?.data?.error || 'No se pudo abrir WhatsApp (¿el jugador tiene teléfono cargado?)')
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-auto my-10 w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-semibold">Registrar cobro</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-700">
            {participant.player_name}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Estado</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="waived">Bonificado</option>
              </select>
            </div>
            {paymentStatus !== 'waived' && (
              <div>
                <label className="block text-sm text-gray-600">Método</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600">Arancel</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={feeAmount}
                  placeholder="0.00"
                  onChange={e => setFeeAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-16 px-1 py-2 border rounded-md text-sm"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            {/* Campo Pagado eliminado: si estado es Pagado, se toma el total automáticamente */}
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600">N° de Recibo</label>
              <input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={3} />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-md">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">Guardar</button>
        </div>
      </div>
    </div>
  )
}

