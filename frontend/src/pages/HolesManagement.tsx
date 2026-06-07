import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/api';

interface CourseHole {
  hole_id: number;
  course_id: number;
  hole_number: number;
  par: number;
  handicap: number;
  distance_meters: number | null;
  distance_yards: number | null;
  description: string | null;
}

interface CourseStatistics {
  total_holes: number;
  total_par: number;
  average_par: number;
  total_distance_meters: number;
  total_distance_yards: number;
  par_3_holes: number;
  par_4_holes: number;
  par_5_holes: number;
}

const HolesManagement: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingHoles, setEditingHoles] = useState<CourseHole[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch holes data
  const { data: holes, isLoading, error } = useQuery({
    queryKey: ['course-holes', clubId],
    queryFn: async () => {
      const response = await authFetch(`/api/club/${clubId}/holes`);
      if (!response.ok) {
        throw new Error('Error al cargar los hoyos');
      }
      const result = await response.json();
      return result.data as CourseHole[];
    },
    enabled: !!clubId
  });

  // Fetch course statistics
  const { data: statistics } = useQuery({
    queryKey: ['course-statistics', clubId],
    queryFn: async () => {
      const response = await authFetch(`/api/club/${clubId}/holes/statistics`);
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      const result = await response.json();
      return result.data as CourseStatistics;
    },
    enabled: !!clubId
  });

  // Initialize editing holes when data loads
  useEffect(() => {
    if (holes && holes.length > 0) {
      setEditingHoles([...holes]);
    }
  }, [holes]);

  // Update holes mutation
  const updateHolesMutation = useMutation({
    mutationFn: async (holesData: CourseHole[]) => {
      const response = await authFetch(`/api/club/${clubId}/holes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ holes: holesData }),
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar los hoyos');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Hoyos actualizados exitosamente');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['course-holes', clubId] });
      queryClient.invalidateQueries({ queryKey: ['course-statistics', clubId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleHoleChange = (holeIndex: number, field: keyof CourseHole, value: any) => {
    const updatedHoles = [...editingHoles];
    updatedHoles[holeIndex] = {
      ...updatedHoles[holeIndex],
      [field]: value
    };
    setEditingHoles(updatedHoles);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateHolesMutation.mutate(editingHoles);
  };

  const handleReset = () => {
    if (holes) {
      setEditingHoles([...holes]);
      setHasChanges(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (window.confirm('¿Estás seguro? Los cambios no guardados se perderán.')) {
        navigate('/clubs');
      }
    } else {
      navigate('/clubs');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de hoyos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar los hoyos</p>
          <button
            onClick={() => navigate('/clubs')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Hoyos - Sistema</h1>
              <p className="mt-1 text-sm text-gray-600">
                Administra la información de cada hoyo del campo desde el sistema central
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBack}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Volver
              </button>
              {hasChanges && (
                <>
                  <button
                    onClick={handleReset}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    Descartar Cambios
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateHolesMutation.isPending}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updateHolesMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Statistics */}
        {statistics && (
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas del Campo</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.total_holes}</div>
                <div className="text-sm text-gray-600">Hoyos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statistics.total_par}</div>
                <div className="text-sm text-gray-600">Par Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.total_distance_meters || 0}m
                </div>
                <div className="text-sm text-gray-600">Distancia Total</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  Par 3: <span className="font-semibold">{statistics.par_3_holes}</span> •
                  Par 4: <span className="font-semibold">{statistics.par_4_holes}</span> •
                  Par 5: <span className="font-semibold">{statistics.par_5_holes}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Holes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Información de Hoyos</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoyo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Par
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handicap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distancia (m)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distancia (yds)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {editingHoles.map((hole, index) => (
                  <tr key={hole.hole_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {hole.hole_number}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={hole.par}
                        onChange={(e) => handleHoleChange(index, 'par', parseInt(e.target.value))}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value={3}>Par 3</option>
                        <option value={4}>Par 4</option>
                        <option value={5}>Par 5</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={hole.handicap}
                        onChange={(e) => handleHoleChange(index, 'handicap', parseInt(e.target.value))}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={hole.distance_meters || ''}
                        onChange={(e) => handleHoleChange(index, 'distance_meters', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="metros"
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={hole.distance_yards || ''}
                        onChange={(e) => handleHoleChange(index, 'distance_yards', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="yardas"
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={hole.description || ''}
                        onChange={(e) => handleHoleChange(index, 'description', e.target.value)}
                        placeholder="Descripción del hoyo"
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Tienes cambios sin guardar
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Recuerda guardar los cambios antes de salir de esta página.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolesManagement;
