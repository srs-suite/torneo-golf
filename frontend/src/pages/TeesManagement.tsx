import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CourseHole {
  hole_id: number;
  hole_number: number;
  par: number;
  handicap: number;
  description: string | null;
}

interface CourseTee {
  tee_id: number;
  hole_id: number;
  tee_name: string;
  tee_color: string;
  category: 'men' | 'women' | 'senior' | 'junior';
  distance_yards: number;
  is_default: boolean;
  display_order: number;
}

interface HoleWithTees extends CourseHole {
  tees: CourseTee[];
}

interface HoleData {
  hole_id: number;
  par: number;
  handicap: number;
}

const PREDEFINED_COLORS = [
  { name: 'Negro', color: '#000000' },
  { name: 'Azul', color: '#0066CC' },
  { name: 'Blanco', color: '#FFFFFF' },
  { name: 'Gris', color: '#D3D3D3' },
  { name: 'Rojo', color: '#CC0000' },
  { name: 'Amarillo', color: '#FFD700' },
  { name: 'Verde', color: '#008000' },
  { name: 'Naranja', color: '#FF8C00' },
  { name: 'Violeta', color: '#8B00FF' },
];

const CATEGORIES = [
  { value: 'men', label: 'Caballeros' },
  { value: 'women', label: 'Damas' },
  { value: 'senior', label: 'Senior' },
  { value: 'junior', label: 'Junior' },
];

export default function TeesManagement() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [editingTee, setEditingTee] = useState<CourseTee | null>(null);
  const [editingHoleNumber, setEditingHoleNumber] = useState<number | null>(null);
  const [newTeeForHole, setNewTeeForHole] = useState<number | null>(null);
  const [holeChanges, setHoleChanges] = useState<{[key: number]: {par?: number, handicap?: number}}>({});

  // Get holes with their tees
  const { data: holesWithTees, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['course-tees-grouped', clubId],
    queryFn: async () => {
      const response = await fetch(`/api/club/${clubId}/tees/grouped`);
      if (!response.ok) {
        throw new Error('Error al cargar las salidas');
      }
      const result = await response.json();
      return result.data as HoleWithTees[];
    },
    enabled: !!clubId
  });

  // Create tee mutation
  const createTeeMutation = useMutation({
    mutationFn: async ({ holeId, teeData }: { holeId: number; teeData: Partial<CourseTee> }) => {
      const response = await fetch(`/api/club/${clubId}/tees/hole/${holeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teeData)
      });
      if (!response.ok) throw new Error('Error al crear salida');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Salida creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['course-tees-grouped', clubId] });
      setNewTeeForHole(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear salida');
    }
  });

  // Update tee mutation
  const updateTeeMutation = useMutation({
    mutationFn: async ({ teeId, teeData }: { teeId: number; teeData: Partial<CourseTee> }) => {
      const response = await fetch(`/api/club/${clubId}/tees/${teeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teeData)
      });
      if (!response.ok) throw new Error('Error al actualizar salida');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Salida actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['course-tees-grouped', clubId] });
      setEditingTee(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar salida');
    }
  });

  // Delete tee mutation
  const deleteTeeMutation = useMutation({
    mutationFn: async (teeId: number) => {
      const response = await fetch(`/api/club/${clubId}/tees/${teeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error al eliminar salida');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Salida eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['course-tees-grouped', clubId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar salida');
    }
  });

  // Update hole data mutation
  const updateHoleMutation = useMutation({
    mutationFn: async (holeData: HoleData) => {
      console.log('🏌️ Updating hole:', holeData);
      const response = await fetch(`/api/club/${clubId}/holes/${holeData.hole_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holeData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Hole update failed:', response.status, errorText);
        throw new Error(`Error al actualizar hoyo: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Datos del hoyo actualizados exitosamente');
      queryClient.invalidateQueries({ queryKey: ['course-tees-grouped', clubId] });
    },
    onError: (error: any) => {
      console.error('❌ Hole update error:', error);
      toast.error(error.message || 'Error al actualizar hoyo');
    }
  });

  const handleBack = () => {
    if (hasChanges) {
      if (window.confirm('¿Estás seguro? Los cambios no guardados se perderán.')) {
        navigate('/clubs');
      }
    } else {
      navigate('/clubs');
    }
  };

  const handleCreateTee = (holeId: number, teeData: Partial<CourseTee>) => {
    createTeeMutation.mutate({ holeId, teeData });
  };

  const handleUpdateTee = (teeId: number, teeData: Partial<CourseTee>) => {
    updateTeeMutation.mutate({ teeId, teeData });
  };

  const handleDeleteTee = (teeId: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta salida?')) {
      deleteTeeMutation.mutate(teeId);
    }
  };

  const handleHoleChange = (holeId: number, field: 'par' | 'handicap', value: number) => {
    setHoleChanges(prev => ({
      ...prev,
      [holeId]: {
        ...prev[holeId],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSaveHoleChanges = (hole: HoleWithTees) => {
    const changes = holeChanges[hole.hole_id];
    if (changes) {
      const updatedHoleData: HoleData = {
        hole_id: hole.hole_id,
        par: changes.par ?? hole.par,
        handicap: changes.handicap ?? hole.handicap
      };
      updateHoleMutation.mutate(updatedHoleData);
      
      // Clear changes for this hole
      setHoleChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[hole.hole_id];
        return newChanges;
      });
      
      // Check if there are still pending changes
      const remainingChanges = Object.keys(holeChanges).filter(id => parseInt(id) !== hole.hole_id);
      if (remainingChanges.length === 0) {
        setHasChanges(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando salidas del campo...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium mb-2">No se pudieron cargar los hoyos del club</p>
          <p className="text-sm text-red-600 mb-4">{(error as Error)?.message || 'Error de conexión con el servidor'}</p>
          <button
            onClick={() => refetch()}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasHoles = (holesWithTees?.length ?? 0) > 0;

  if (!hasHoles) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-800 font-medium mb-2">Este club aún no tiene hoyos configurados</p>
          <p className="text-sm text-amber-700 mb-4">Recargá la página; el sistema debería crear 18 hoyos por defecto automáticamente.</p>
          <button
            onClick={() => refetch()}
            className="bg-amber-600 text-white px-4 py-2 rounded text-sm hover:bg-amber-700"
          >
            Recargar hoyos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Hoyos - Sistema</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configura Par, HCP y múltiples salidas por hoyo con distancias, colores y categorías
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Instrucciones:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Configura el Par (3, 4, 5) y HCP (1-18) de cada hoyo</li>
          <li>• Cada hoyo puede tener múltiples salidas/tees con diferentes distancias</li>
          <li>• Las salidas se distinguen por color (Negro, Azul, Rojo, Gris, etc.)</li>
          <li>• Cada salida tiene una categoría (Caballeros, Damas, Senior, Junior)</li>
          <li>• Solo se puede marcar una salida como "por defecto" por categoría</li>
          <li>• Las distancias se registran en yardas únicamente</li>
        </ul>
      </div>

      {/* Holes and Tees */}
      <div className="space-y-6">
        {holesWithTees?.map((hole) => (
          <div key={hole.hole_id} className="bg-white rounded-lg shadow border border-gray-200">
            {/* Hole Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Hoyo {hole.hole_number}
                    </h3>
                    
                    {/* Par Selector */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Par:</label>
                      <select
                        value={holeChanges[hole.hole_id]?.par ?? hole.par}
                        onChange={(e) => handleHoleChange(hole.hole_id, 'par', parseInt(e.target.value))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>

                    {/* HCP Selector */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">HCP:</label>
                      <select
                        value={holeChanges[hole.hole_id]?.handicap ?? hole.handicap}
                        onChange={(e) => handleHoleChange(hole.hole_id, 'handicap', parseInt(e.target.value))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>

                    {/* Save Button */}
                    {holeChanges[hole.hole_id] && (
                      <button
                        onClick={() => handleSaveHoleChanges(hole)}
                        disabled={updateHoleMutation.isPending}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updateHoleMutation.isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {hole.tees.length} salida{hole.tees.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <button
                  onClick={() => setNewTeeForHole(hole.hole_id)}
                  className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar Salida</span>
                </button>
              </div>
            </div>

            {/* Tees */}
            <div className="p-6">
              {hole.tees.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay salidas configuradas para este hoyo
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Color</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Nombre</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Categoría</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Distancia (yds)</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Por Defecto</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Orden</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hole.tees
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((tee) => (
                          <tr key={tee.tee_id} className="border-b border-gray-100">
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                                  style={{ backgroundColor: tee.tee_color }}
                                ></div>
                                <span className="text-xs text-gray-500">{tee.tee_color}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-sm font-medium">{tee.tee_name}</td>
                            <td className="py-3 px-3 text-sm">
                              {CATEGORIES.find(c => c.value === tee.category)?.label}
                            </td>
                            <td className="py-3 px-3 text-sm">{tee.distance_yards}</td>
                            <td className="py-3 px-3 text-sm">
                              {tee.is_default ? (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  Por defecto
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-sm">{tee.display_order}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingTee(tee);
                                    setEditingHoleNumber(hole.hole_number);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTee(tee.tee_id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Tee Form */}
            {newTeeForHole === hole.hole_id && (
              <TeeForm
                onSave={(teeData) => handleCreateTee(hole.hole_id, teeData)}
                onCancel={() => setNewTeeForHole(null)}
                isCreating={true}
              />
            )}
          </div>
        ))}
      </div>

      {/* Edit Tee Modal */}
      {editingTee && editingHoleNumber && (
        <TeeEditModal
          tee={editingTee}
          holeNumber={editingHoleNumber}
          onSave={(teeData) => handleUpdateTee(editingTee.tee_id, teeData)}
          onCancel={() => {
            setEditingTee(null);
            setEditingHoleNumber(null);
          }}
        />
      )}
    </div>
  );
}

// Tee Form Component
interface TeeFormProps {
  onSave: (teeData: Partial<CourseTee>) => void;
  onCancel: () => void;
  isCreating: boolean;
  initialData?: Partial<CourseTee>;
}

function TeeForm({ onSave, onCancel, isCreating, initialData }: TeeFormProps) {
  const [formData, setFormData] = useState({
    tee_name: initialData?.tee_name || '',
    tee_color: initialData?.tee_color || '#000000',
    category: initialData?.category || 'men' as 'men' | 'women' | 'senior' | 'junior',
    distance_yards: initialData?.distance_yards || 0,
    is_default: initialData?.is_default || false,
    display_order: initialData?.display_order || 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tee_name.trim()) {
      toast.error('El nombre de la salida es requerido');
      return;
    }
    
    if (formData.distance_yards <= 0) {
      toast.error('La distancia debe ser mayor a 0');
      return;
    }

    onSave(formData);
  };

  const handlePredefinedColor = (color: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      tee_color: color,
      // Siempre actualizar el nombre al seleccionar un color predefinido
      tee_name: name
    }));
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-6">
      <h4 className="text-md font-medium text-gray-900 mb-4">
        {isCreating ? 'Agregar Nueva Salida' : 'Editar Salida'}
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Salida
            </label>
            <input
              type="text"
              value={formData.tee_name}
              onChange={(e) => setFormData(prev => ({ ...prev, tee_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Ej: Negro, Azul, Rojo"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distancia (yardas)
            </label>
            <input
              type="number"
              value={formData.distance_yards}
              onChange={(e) => setFormData(prev => ({ ...prev, distance_yards: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              min="1"
              max="800"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orden de Visualización
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              min="1"
              max="20"
            />
          </div>

          {/* Is Default */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
              Salida por defecto para esta categoría
            </label>
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color de la Salida
          </label>
          
          {/* Predefined Colors */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PREDEFINED_COLORS.map((colorOption) => (
              <button
                key={colorOption.name}
                type="button"
                onClick={() => handlePredefinedColor(colorOption.color, colorOption.name)}
                className={`flex items-center space-x-2 px-3 py-2 rounded border text-sm ${
                  formData.tee_color === colorOption.color 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div 
                  className="w-4 h-4 rounded-full border border-gray-400"
                  style={{ backgroundColor: colorOption.color }}
                ></div>
                <span>{colorOption.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Color */}
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={formData.tee_color}
              onChange={(e) => setFormData(prev => ({ ...prev, tee_color: e.target.value }))}
              className="w-10 h-8 border border-gray-300 rounded"
            />
            <input
              type="text"
              value={formData.tee_color}
              onChange={(e) => setFormData(prev => ({ ...prev, tee_color: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm w-24"
              placeholder="#000000"
            />
            <span className="text-sm text-gray-500">Color personalizado</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
          >
            {isCreating ? 'Crear Salida' : 'Guardar Cambios'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// Tee Edit Modal Component
interface TeeEditModalProps {
  tee: CourseTee;
  holeNumber: number;
  onSave: (teeData: Partial<CourseTee>) => void;
  onCancel: () => void;
}

function TeeEditModal({ tee, holeNumber, onSave, onCancel }: TeeEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Editando Salida - Hoyo {holeNumber}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {tee.tee_name} ({CATEGORIES.find(c => c.value === tee.category)?.label})
            </p>
          </div>
          <TeeForm
            onSave={onSave}
            onCancel={onCancel}
            isCreating={false}
            initialData={tee}
          />
        </div>
      </div>
    </div>
  );
}
