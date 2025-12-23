import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User } from 'lucide-react';
import { useCreateMember, useUpdateMember } from '@/hooks/useMembers';
import type { Member } from '@/types/member';

const memberSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().min(1, 'El apellido es requerido'),
  member_number: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  handicap_index: z.number().min(-10).max(54).optional(),
  handicap_local: z.number().min(0).max(54).optional(),
  gender: z.enum(['M', 'F', 'Other']).optional(),
  membership_type: z.enum(['full', 'associate', 'junior', 'guest']).optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: number;
  editMember?: Member | null;
}

export function CreateMemberModal({ isOpen, onClose, clubId, editMember }: CreateMemberModalProps) {
  const isEdit = !!editMember;
  const createMember = useCreateMember(clubId);
  const updateMember = useUpdateMember(clubId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      gender: 'M',
      membership_type: 'full',
      handicap_index: 0,
      handicap_local: 0,
    },
  });

  // Cargar datos del socio en modo edición
  useEffect(() => {
    if (editMember) {
      setValue('first_name', editMember.first_name);
      setValue('last_name', editMember.last_name);
      setValue('member_number', editMember.member_number || '');
      setValue('email', editMember.email || '');
      setValue('phone', editMember.phone || '');
      setValue('handicap_index', editMember.handicap_index);
      setValue('handicap_local', editMember.handicap_local || 0);
      setValue('gender', editMember.gender || 'M');
      setValue('membership_type', editMember.membership_type);
      setValue('emergency_contact', editMember.emergency_contact || '');
      setValue('emergency_phone', editMember.emergency_phone || '');
      setValue('notes', editMember.notes || '');
    } else {
      reset({
        gender: 'M',
        membership_type: 'full',
        handicap_index: 0,
        handicap_local: 0,
      });
    }
  }, [editMember, setValue, reset]);

  const onSubmit = async (data: MemberFormData) => {
    try {
      const memberData = {
        ...data,
        course_id: clubId,
        email: data.email || undefined,
        phone: data.phone || undefined,
        member_number: data.member_number || undefined,
        emergency_contact: data.emergency_contact || undefined,
        emergency_phone: data.emergency_phone || undefined,
        notes: data.notes || undefined,
      };

      if (isEdit && editMember) {
        await updateMember.mutateAsync({
          memberId: editMember.member_id,
          ...memberData,
        });
      } else {
        await createMember.mutateAsync(memberData);
      }

      onClose();
      reset();
    } catch (error) {
      console.error('Error saving socio:', error);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                {isEdit ? 'Editar Socio' : 'Agregar Nuevo Socio'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  {...register('first_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  {...register('last_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Socio
                </label>
                <input
                  {...register('member_number')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Index
                </label>
                <input
                  {...register('handicap_index', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="-10"
                  max="54"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HCP
                </label>
                <input
                  {...register('handicap_local', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0"
                  max="54"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Género
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Membresía
                </label>
                <select
                  {...register('membership_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                >
                  <option value="full">Completa</option>
                  <option value="associate">Asociado</option>
                  <option value="junior">Junior</option>
                  <option value="guest">Invitado</option>
                </select>
              </div>
            </div>

            {/* Contacto de emergencia */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Contacto de Emergencia</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Contacto
                  </label>
                  <input
                    {...register('emergency_contact')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono de Emergencia
                  </label>
                  <input
                    {...register('emergency_phone')}
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
                placeholder="Notas adicionales sobre el socio..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar Socio' : 'Agregar Socio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
