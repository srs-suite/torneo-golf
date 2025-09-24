import { useState } from 'react';
import { Users, Plus, Search, Filter, RefreshCw, Eye, Edit, Trash2, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { useMembers, useDeleteMember, useUpdateMemberStatus } from '@/hooks/useMembers';
import { CreateMemberModal } from '@/components/CreateMemberModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Member, MemberFilters } from '@/types/member';

// Por ahora usamos un club fijo, luego esto vendrá del contexto o ruta
const CLUB_ID = 1;

export function SociosManagement() {
  console.log('🏌️ SociosManagement component loaded');
  
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    status: '',
    membershipType: '',
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { data: members = [], isLoading, error, refetch } = useMembers(CLUB_ID);
  const deleteMember = useDeleteMember(CLUB_ID);
  const updateMemberStatus = useUpdateMemberStatus(CLUB_ID);

  // Filtrar socios
  const filteredMembers = members.filter(member => {
    const matchesSearch = !filters.search || 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.member_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.phone?.includes(filters.search);

    const matchesStatus = !filters.status || 
      (filters.status === 'active' && member.membership_status === 'active') ||
      (filters.status === 'inactive' && member.membership_status !== 'active');

    const matchesType = !filters.membershipType || member.membership_type === filters.membershipType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDeleteMember = async (member: Member) => {
    if (member.membership_status === 'active') {
      // Si está activo, ofrecemos desactivar en lugar de eliminar
      if (window.confirm(`¿Está seguro de que desea desactivar al socio ${member.first_name} ${member.last_name}? Podrá reactivarlo posteriormente.`)) {
        updateMemberStatus.mutate({ memberId: member.member_id, status: 'inactive' });
      }
    } else {
      // Si ya está inactivo, ofrecemos eliminación permanente
      if (window.confirm(`¿Está seguro de que desea eliminar PERMANENTEMENTE al socio ${member.first_name} ${member.last_name}? Esta acción no se puede deshacer y se perderá todo el historial.`)) {
        deleteMember.mutate(member.member_id);
      }
    }
  };

  const handleToggleStatus = async (member: Member) => {
    console.log('🔄 handleToggleStatus ejecutándose:', member);
    const newStatus = member.membership_status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activar' : 'desactivar';
    
    console.log('🔄 Mostrando confirmación para:', action);
    if (window.confirm(`¿Está seguro de que desea ${action} a ${member.first_name} ${member.last_name}?`)) {
      console.log('🔄 Usuario confirmó, ejecutando mutación...');
      updateMemberStatus.mutate({ memberId: member.member_id, status: newStatus });
    } else {
      console.log('🔄 Usuario canceló la acción');
    }
  };

  const getMembershipTypeText = (type: string) => {
    const types = {
      full: 'Completa',
      associate: 'Asociado',
      junior: 'Junior',
      guest: 'Invitado'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Activo' : 'Inactivo'}
      </span>
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error al cargar socios: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Socios</h1>
              <p className="text-gray-600">Administra los socios de tu club</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => alert('Funcionalidad de importación de Excel próximamente')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Excel
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Socio
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar socios..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-black focus:border-black"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select
            value={filters.membershipType}
            onChange={(e) => setFilters(prev => ({ ...prev, membershipType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black"
          >
            <option value="">Todos los tipos</option>
            <option value="full">Completa</option>
            <option value="associate">Asociado</option>
            <option value="junior">Junior</option>
            <option value="guest">Invitado</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            {filteredMembers.length} de {members.length} socios
          </div>
        </div>
      </div>

      {/* Tabla de socios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Socio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matrícula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Index
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HCP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.member_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{member.email || 'Sin email'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.member_number || 'Sin asignar'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.handicap_index !== null && member.handicap_index !== undefined ? member.handicap_index : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.handicap_local !== null && member.handicap_local !== undefined ? member.handicap_local : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getMembershipTypeText(member.membership_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.membership_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.phone || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          console.log('👁️ Botón ver clickeado - TEST BÁSICO');
                          alert(`TEST: Ver detalles de ${member.first_name} ${member.last_name}`);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔧 Botón editar clickeado:', member);
                          setEditingMember(member);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔄 Botón toggle clickeado:', member);
                          handleToggleStatus(member);
                        }}
                        className={`${member.membership_status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                        title={member.membership_status === 'active' ? 'Desactivar' : 'Activar'}
                      >
                        {member.membership_status === 'active' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          console.log('🗑️ Botón eliminar clickeado:', member);
                          handleDeleteMember(member);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title={member.membership_status === 'active' ? 'Desactivar' : 'Eliminar permanentemente'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay miembros</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status || filters.membershipType 
                ? 'No se encontraron miembros con los filtros seleccionados.' 
                : 'Comienza agregando un nuevo miembro.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de crear/editar miembro */}
      <CreateMemberModal
        isOpen={isCreateModalOpen || !!editingMember}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMember(null);
        }}
        clubId={CLUB_ID}
        editMember={editingMember}
      />
    </div>
  );
}
