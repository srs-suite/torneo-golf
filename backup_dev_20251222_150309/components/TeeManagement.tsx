import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface CourseTee {
  tee_id?: number;
  course_id: number;
  tee_type: 'negro' | 'azul' | 'blanco' | 'amarillo' | 'rojo';
  tee_name: string;
  slope_rating: number;
  course_rating: number;
  par: number;
  total_distance_yards: number;
  gender: 'M' | 'F' | 'both';
  handicap_min?: number | null;
  handicap_max?: number | null;
  is_active: boolean;
}

interface TeeManagementProps {
  clubId: number;
  tees: CourseTee[];
  onTeesUpdate: () => void;
}

const TeeManagement: React.FC<TeeManagementProps> = ({ clubId, tees, onTeesUpdate }) => {
  const [editingTee, setEditingTee] = useState<CourseTee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const teeTypeOptions = [
    { value: 'negro', label: '⚫ Negro - Profesional', color: '#000000' },
    { value: 'azul', label: '🔵 Azul - HCP Bajo', color: '#0066CC' },
    { value: 'blanco', label: '⚪ Blanco - HCP Medio/Alto', color: '#FFFFFF' },
    { value: 'amarillo', label: '🟡 Amarillo - Seniors/Juveniles', color: '#FFD700' },
    { value: 'rojo', label: '🔴 Rojo - Damas', color: '#DC2626' },
  ];

  const genderOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'both', label: 'Ambos' },
  ];

  const getDefaultTeeData = (): CourseTee => ({
    course_id: clubId,
    tee_type: 'blanco',
    tee_name: '',
    slope_rating: 113,
    course_rating: 72.0,
    par: 72,
    total_distance_yards: 6000,
    gender: 'both',
    handicap_min: null,
    handicap_max: null,
    is_active: true,
  });

  const handleEdit = (tee: CourseTee) => {
    setEditingTee({ ...tee });
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setEditingTee(getDefaultTeeData());
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!editingTee) return;

    setIsLoading(true);
    try {
      const method = showAddForm ? 'POST' : 'PUT';
      const url = showAddForm 
        ? `/api/club/${clubId}/tees`
        : `/api/club/${clubId}/tees/${editingTee.tee_id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTee),
      });

      if (response.ok) {
        setEditingTee(null);
        setShowAddForm(false);
        onTeesUpdate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Error guardando tee'}`);
      }
    } catch (error) {
      alert('Error de conexión');
      console.error('Error saving tee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (teeId: number) => {
    if (!confirm('¿Estás seguro de eliminar este tee?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/club/${clubId}/tees/${teeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onTeesUpdate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Error eliminando tee'}`);
      }
    } catch (error) {
      alert('Error de conexión');
      console.error('Error deleting tee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingTee(null);
    setShowAddForm(false);
  };

  const updateEditingTee = (field: keyof CourseTee, value: any) => {
    if (!editingTee) return;
    setEditingTee({ ...editingTee, [field]: value });
  };

  const getTeeColor = (teeType: string) => {
    const option = teeTypeOptions.find(opt => opt.value === teeType);
    return option?.color || '#6B7280';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Configuración de Tees</h3>
            <p className="text-sm text-gray-500">
              Gestiona los diferentes tees y sus características de juego
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Tee</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slope Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distancia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Género
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                HCP Rango
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tees.map((tee) => (
              <tr key={tee.tee_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2 border"
                      style={{ backgroundColor: getTeeColor(tee.tee_type) }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {tee.tee_name}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {tee.tee_type}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tee.slope_rating}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tee.course_rating}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tee.total_distance_yards} yds
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tee.gender === 'M' ? 'Masculino' : tee.gender === 'F' ? 'Femenino' : 'Ambos'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tee.handicap_min !== null || tee.handicap_max !== null 
                    ? `${tee.handicap_min || '0'} - ${tee.handicap_max || '∞'}`
                    : 'Sin límite'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(tee)}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={isLoading}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tee.tee_id!)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isLoading}
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

      {/* Edit/Add Form Modal */}
      {editingTee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {showAddForm ? 'Agregar Nuevo Tee' : 'Editar Tee'}
              </h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Tee
                </label>
                <select
                  value={editingTee.tee_type}
                  onChange={(e) => updateEditingTee('tee_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {teeTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Tee
                </label>
                <input
                  type="text"
                  value={editingTee.tee_name}
                  onChange={(e) => updateEditingTee('tee_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="ej. Profesional, Caballeros HCP Bajo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slope Rating (55-155)
                </label>
                <input
                  type="number"
                  min="55"
                  max="155"
                  value={editingTee.slope_rating}
                  onChange={(e) => updateEditingTee('slope_rating', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="40"
                  max="85"
                  value={editingTee.course_rating}
                  onChange={(e) => updateEditingTee('course_rating', parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Par del Campo
                </label>
                <input
                  type="number"
                  min="54"
                  max="80"
                  value={editingTee.par}
                  onChange={(e) => updateEditingTee('par', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distancia Total (yards)
                </label>
                <input
                  type="number"
                  min="4000"
                  max="8000"
                  value={editingTee.total_distance_yards}
                  onChange={(e) => updateEditingTee('total_distance_yards', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Género
                </label>
                <select
                  value={editingTee.gender}
                  onChange={(e) => updateEditingTee('gender', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HCP Mínimo (opcional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="54"
                  value={editingTee.handicap_min || ''}
                  onChange={(e) => updateEditingTee('handicap_min', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Sin mínimo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HCP Máximo (opcional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="54"
                  value={editingTee.handicap_max || ''}
                  onChange={(e) => updateEditingTee('handicap_max', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Sin máximo"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={isLoading}
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeeManagement;



