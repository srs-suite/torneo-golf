import { useState } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: number
  onImportSuccess: () => void
}

interface ImportedMember {
  full_name: string
  member_number?: string
  handicap_index?: number
  handicap_local?: number  // HCP manual
  email?: string
  phone?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface NameMatch {
  row: number
  excelName: string
  dbName: string
  dbId: number
  matchType: 'exact' | 'intelligent' | 'matricula'
  action: 'skipped' | 'updated' | 'created'
  changes?: string[]
}

interface ImportSummary {
  created: number
  updated: number
  skipped: number
  notFound: number
  nameMatches: NameMatch[]
  errors: string[]
}

export function ExcelImportModal({ isOpen, onClose, clubId, onImportSuccess }: ExcelImportModalProps) {
  const [importedData, setImportedData] = useState<ImportedMember[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [importMode, setImportMode] = useState<'create' | 'update'>('create')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [showDetailedReport, setShowDetailedReport] = useState(false)

  // Limpiar datos cuando se abre el modal
  if (isOpen && importedData.length === 0 && validationErrors.length === 0 && fileName === '') {
    // Modal recién abierto, datos ya están limpios
  } else if (!isOpen) {
    // Modal cerrado, limpiar para la próxima vez
    if (importedData.length > 0 || validationErrors.length > 0 || fileName !== '' || importMode !== 'create' || showSuccessModal) {
      setTimeout(() => {
        setImportedData([])
        setValidationErrors([])
        setFileName('')
        setIsProcessing(false)
        setImportMode('create')
        setShowSuccessModal(false)
        setSuccessMessage('')
      }, 100)
    }
  }

  if (!isOpen) return null

  // Modal de éxito personalizado
  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
            {importMode === 'create' ? 'Socios Creados' : 'Socios Actualizados'}
          </h2>
          
          {/* Message */}
          <div className="text-center text-gray-700 mb-6 whitespace-pre-line">
            {successMessage}
          </div>
          
          {/* Buttons */}
          <div className="flex justify-center space-x-3">
            {importSummary && importSummary.nameMatches.length > 0 && (
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setShowDetailedReport(true)
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Ver Detalles
              </button>
            )}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Modal de reporte detallado
  if (showDetailedReport && importSummary) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                📊 Reporte Detallado de Importación
              </h2>
              <button
                onClick={() => setShowDetailedReport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{importSummary.created}</div>
                <div className="text-sm text-green-700">Creados</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{importSummary.updated}</div>
                <div className="text-sm text-blue-700">Actualizados</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{importSummary.skipped}</div>
                <div className="text-sm text-yellow-700">Omitidos</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{importSummary.notFound}</div>
                <div className="text-sm text-red-700">No encontrados</div>
              </div>
            </div>

            {/* Coincidencias */}
            {importSummary.nameMatches.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎯 Coincidencias Detectadas ({importSummary.nameMatches.length})
                </h3>
                <div className="space-y-3">
                  {importSummary.nameMatches.map((match, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      match.matchType === 'intelligent' ? 'bg-orange-50 border-orange-400' :
                      match.matchType === 'exact' ? 'bg-green-50 border-green-400' :
                      'bg-blue-50 border-blue-400'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-600">Fila {match.row}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              match.matchType === 'intelligent' ? 'bg-orange-100 text-orange-800' :
                              match.matchType === 'exact' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {match.matchType === 'intelligent' ? 'Coincidencia Inteligente' :
                               match.matchType === 'exact' ? 'Coincidencia Exacta' :
                               'Por Matrícula'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              match.action === 'updated' ? 'bg-blue-100 text-blue-800' :
                              match.action === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {match.action === 'updated' ? 'Actualizado' :
                               match.action === 'skipped' ? 'Omitido' :
                               'Creado'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <div><strong>Excel:</strong> {match.excelName}</div>
                            <div><strong>Base de Datos:</strong> {match.dbName} (ID: {match.dbId})</div>
                            {match.changes && match.changes.length > 0 && (
                              <div className="mt-2">
                                <strong>Cambios realizados:</strong>
                                <ul className="list-disc list-inside ml-2">
                                  {match.changes.map((change, i) => (
                                    <li key={i} className="text-xs text-gray-600">{change}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advertencia para coincidencias inteligentes */}
            {importSummary.nameMatches.some(m => m.matchType === 'intelligent') && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800 mb-1">
                      ⚠️ Atención: Coincidencias Automáticas
                    </h4>
                    <p className="text-sm text-orange-700">
                      Se detectaron coincidencias automáticas basadas en apellido y primer nombre. 
                      Verifica que las coincidencias sean correctas, especialmente si hay múltiples 
                      personas con nombres similares en tu club.
                    </p>
                    <div className="mt-3 text-sm text-orange-700">
                      <strong>Casos especiales:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Si una persona en BD tiene matrícula pero en Excel no, el sistema podría no detectar la coincidencia</li>
                        <li>Si son personas diferentes con nombres similares, revisa manualmente los duplicados</li>
                        <li>Recomendación: Siempre incluir matrículas en el Excel para mayor precisión</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={() => setShowDetailedReport(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Formatear nombre completo y corregir "Apellido, Nombre" -> "Nombre Apellido"
  const formatName = (name: string): string => {
    if (!name || typeof name !== 'string') return ''

    // Normalizar espacios
    let raw = name.replace(/\s+/g, ' ').trim()

    // Si viene como "Apellido, Nombre [SegundoNombre]" o con ';' o '|', reordenar
    const splitter = /[,;|]/
    if (splitter.test(raw)) {
      const parts = raw.split(splitter).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const lastName = parts[0]
        const firstNames = parts.slice(1).join(' ')
        raw = `${firstNames} ${lastName}`
      }
    }

    // Title Case
    return raw
      .split(' ')
      .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
      .filter(Boolean)
      .join(' ')
  }

  // Función para comparar nombres de manera inteligente
  const namesMatch = (name1: string, name2: string): boolean => {
    if (!name1 || !name2) return false
    
    // Normalizar nombres (minúsculas, sin acentos, sin espacios extra)
    const normalize = (name: string) => name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/\s+/g, ' ')
      .trim()
    
    const normalized1 = normalize(name1)
    const normalized2 = normalize(name2)
    
    // Si son exactamente iguales
    if (normalized1 === normalized2) return true
    
    // Dividir en palabras
    const words1 = normalized1.split(' ').filter(w => w.length > 0)
    const words2 = normalized2.split(' ').filter(w => w.length > 0)
    
    if (words1.length === 0 || words2.length === 0) return false
    
    // Estrategia: El apellido (última palabra) debe coincidir + al menos un nombre
    const lastName1 = words1[words1.length - 1]
    const lastName2 = words2[words2.length - 1]
    const firstNames1 = words1.slice(0, -1)
    const firstNames2 = words2.slice(0, -1)
    
    // El apellido debe coincidir
    if (lastName1 !== lastName2) return false
    
    // Al menos un nombre debe coincidir
    if (firstNames1.length === 0 || firstNames2.length === 0) return false
    
    // Verificar si hay al menos una coincidencia en los nombres
    const hasCommonFirstName = firstNames1.some(name1 => 
      firstNames2.some(name2 => name1 === name2)
    )
    
    if (!hasCommonFirstName) return false
    
    // REGLA ADICIONAL: Si hay diferencia significativa en cantidad de nombres, ser más conservador
    const nameDifference = Math.abs(firstNames1.length - firstNames2.length)
    
    // Si uno tiene 1 nombre y el otro tiene 3+ nombres, es sospechoso
    if (nameDifference >= 2) {
      // Solo hacer match si el nombre más corto está COMPLETAMENTE contenido en el más largo
      const shorterNames = firstNames1.length < firstNames2.length ? firstNames1 : firstNames2
      const longerNames = firstNames1.length < firstNames2.length ? firstNames2 : firstNames1
      
      // Todos los nombres cortos deben estar en los nombres largos
      const allNamesMatch = shorterNames.every(shortName => 
        longerNames.includes(shortName)
      )
      
      return allNamesMatch
    }
    
    return true
  }

  const validateData = (data: any[]): { valid: ImportedMember[], errors: ValidationError[] } => {
    const valid: ImportedMember[] = []
    const errors: ValidationError[] = []

    data.forEach((row, index) => {
      const rowNum = index + 2 // +2 porque empezamos en fila 2 (después del header)
      
      // Validar "Nombre y Apellido" (requerido) - buscar con diferentes variaciones
      const fullName = row['APELLIDO Y NOMBRE'] || row['Apellido y Nombre'] || row['apellido y nombre'] ||
                       row['Nombre Y Apellido'] || row['Nombre y Apellido'] || row['Nombre'] || 
                       row['NOMBRE Y APELLIDO'] || row['nombre y apellido'] || row['Nombre y apellido'] || 
                       row['nombre'] || row['Socio'] || row['SOCIO'] || row['socio'] || ''
      
      console.log(`Fila ${rowNum}: Columnas disponibles:`, Object.keys(row))
      console.log(`Fila ${rowNum}: Nombre encontrado:`, fullName)
      
      if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
        const availableColumns = Object.keys(row).join(', ')
        errors.push({ 
          row: rowNum, 
          field: 'Nombre y Apellido', 
          message: `Nombre y Apellido es requerido. Columnas encontradas: ${availableColumns}` 
        })
      }

      // Formatear el nombre completo con primera letra mayúscula
      const formattedFullName = formatName(fullName)

      // Validar Index (opcional, pero si se proporciona debe ser válido)
      const indexValue = row['HDP'] || row['hdp'] || row['Index'] || row['INDEX'] || row['index'] || row['Índice'] || row['ÍNDICE'] || row['HCP Index'] || row['Handicap Index'] || row['HANDICAP INDEX'] || row['handicap index']
      let validIndex = undefined
      if (indexValue !== undefined && indexValue !== null && indexValue !== '') {
        // Limpiar caracteres especiales como asteriscos, espacios, etc. (mantener el signo +)
        const cleanedIndexValue = String(indexValue).replace(/[*\s]/g, '').replace(/^\*/, '+')
        if (isNaN(Number(cleanedIndexValue)) || Number(cleanedIndexValue) < -10 || Number(cleanedIndexValue) > 72) {
          errors.push({ row: rowNum, field: 'Index', message: `Index debe ser un número entre -10 y 72 (ej: +0.5, 15.7, etc.). Valor encontrado: "${indexValue}". Columnas disponibles: ${Object.keys(row).join(', ')}` })
        } else {
          validIndex = parseFloat(cleanedIndexValue)
        }
      }

      // Validar HCP (opcional, pero si se proporciona debe ser válido)
      const hcpValue = row['HCP'] || row['hcp'] || row['Hcp'] || row['Handicap'] || row['HANDICAP'] || row['handicap']
      let validHcp = undefined
      if (hcpValue !== undefined && hcpValue !== null && hcpValue !== '') {
        // Limpiar caracteres especiales como asteriscos, espacios, etc. (mantener el signo +)
        const cleanedHcpValue = String(hcpValue).replace(/[*\s]/g, '').replace(/^\*/, '+')
        if (isNaN(Number(cleanedHcpValue)) || Number(cleanedHcpValue) < -10 || Number(cleanedHcpValue) > 72) {
          errors.push({ row: rowNum, field: 'HCP', message: 'HCP debe ser un número entre -10 y 72 (ej: +1, 0, 15, etc.)' })
        } else {
          validHcp = Math.round(Number(cleanedHcpValue)) // Asegurar que sea entero
        }
      }

      // Campos opcionales con búsqueda flexible
      const memberNumber = row['Matrícula'] || row['Matricula'] || row['MATRÍCULA'] || row['MATRICULA'] || row['matricula'] || 
                           row['Número'] || row['Numero'] || ''
      
      // Debug: mostrar qué columnas están disponibles y qué valor se encontró
      if (rowNum === 1) { // Solo para la primera fila para no saturar
        console.log('🔍 DEBUG - Columnas disponibles en Excel:', Object.keys(row))
        console.log('🔍 DEBUG - Valor de matrícula encontrado:', {
          'Matrícula': row['Matrícula'],
          'Matricula': row['Matricula'], 
          'MATRÍCULA': row['MATRÍCULA'],
          'matricula': row['matricula'],
          'MATRICULA': row['MATRICULA'],
          'memberNumber_final': memberNumber
        })
      }
      
      // Procesar número de matrícula: si está vacío o es null/undefined, dejarlo como string vacío
      const cleanMemberNumber = memberNumber && String(memberNumber).trim() !== '' 
                                ? String(memberNumber).trim() 
                                : ''
      
      const email = row['Email'] || row['email'] || row['EMAIL'] || row['E-mail'] || row['Correo'] || ''
      const phone = row['Teléfono'] || row['Telefono'] || row['TELÉFONO'] || row['Phone'] || row['Celular'] || ''

      // Validar email si se proporciona
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNum, field: 'Email', message: 'Email inválido' })
      }

      // Si todas las validaciones pasaron, agregar a válidos
      if (errors.filter(e => e.row === rowNum).length === 0) {
        valid.push({
          full_name: formattedFullName, // Usar el nombre formateado
          member_number: cleanMemberNumber || undefined, // Usar el número de matrícula limpio
          handicap_index: validIndex || undefined,
          handicap_local: validHcp || undefined,
          email: email ? email.trim() : undefined,
          phone: phone ? String(phone).trim() : undefined
        })
      }
    })

    return { valid, errors }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Limpiar datos anteriores
    setImportedData([])
    setValidationErrors([])
    setFileName(file.name)
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        console.log('Datos del Excel:', jsonData)
        console.log('Primera fila (headers):', jsonData[0] ? Object.keys(jsonData[0]) : 'No hay datos')

        if (jsonData.length === 0) {
          setValidationErrors([{ row: 1, field: 'general', message: 'El archivo está vacío' }])
          setImportedData([])
        } else {
          const { valid, errors } = validateData(jsonData)
          setImportedData(valid)
          setValidationErrors(errors)
        }
      } catch (error) {
        console.error('Error procesando archivo:', error)
        setValidationErrors([{ row: 1, field: 'general', message: 'Error al procesar el archivo Excel' }])
        setImportedData([])
      } finally {
        setIsProcessing(false)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (importedData.length === 0) return

    setIsProcessing(true)
    try {
      console.log(`🚀 Iniciando importación en modo: ${importMode === 'create' ? 'CREAR SOCIOS' : 'ACTUALIZAR INDEX/HCP'}`)
      
      // Primero obtenemos todos los miembros existentes
      const existingMembersResponse = await fetch(`http://localhost:8000/api/club/${clubId}/members`)
      if (!existingMembersResponse.ok) {
        throw new Error('Error al obtener miembros existentes')
      }
      const existingMembersData = await existingMembersResponse.json()
      const existingMembers = existingMembersData.data || []

      let created = 0
      let updated = 0
      let skipped = 0
      let notFound = 0
      const nameMatches: NameMatch[] = []
      const errors: string[] = []

      // Procesar cada miembro del Excel
      for (let index = 0; index < importedData.length; index++) {
        const member = importedData[index]
        const rowNumber = index + 2 // +2 porque empezamos en fila 2 (después del header)
        // Dividir nombre completo para la API
        const nameParts = member.full_name.trim().split(' ')
        let firstName = ''
        let lastName = ''
        
        if (nameParts.length === 1) {
          firstName = nameParts[0]
          lastName = ''
        } else if (nameParts.length >= 2) {
          firstName = nameParts.slice(0, -1).join(' ')
          lastName = nameParts[nameParts.length - 1]
        }

        const fullName = `${firstName} ${lastName}`.trim()
        let existingMember = null
        let searchCriteria = ''
        
        // LÓGICA DIFERENTE SEGÚN EL MODO
        if (importMode === 'create') {
          // MODO CREAR: Buscar para evitar duplicados
          if (member.member_number && member.member_number.trim() !== '') {
            // Tiene matrícula: buscar por número de matrícula
            searchCriteria = `matrícula: ${member.member_number}`
            existingMember = existingMembers.find((existing: any) => {
              const isMatch = existing.member_number === member.member_number?.trim()
              if (isMatch) {
                const existingFullName = `${existing.first_name} ${existing.last_name}`.trim()
                nameMatches.push({
                  row: rowNumber,
                  excelName: fullName,
                  dbName: existingFullName,
                  dbId: existing.member_id,
                  matchType: 'matricula',
                  action: 'skipped' // Se actualizará después según la acción tomada
                })
              }
              return isMatch
            })
          } else {
            // No tiene matrícula: buscar por nombre completo con algoritmo inteligente
            searchCriteria = `nombre: ${fullName}`
            existingMember = existingMembers.find((existing: any) => {
              const existingFullName = `${existing.first_name} ${existing.last_name}`.trim()
              const isExactMatch = existingFullName.toLowerCase() === fullName.toLowerCase()
              const isIntelligentMatch = !isExactMatch && namesMatch(existingFullName, fullName)
              
              if (isExactMatch || isIntelligentMatch) {
                // Registrar la coincidencia para el reporte
                nameMatches.push({
                  row: rowNumber,
                  excelName: fullName,
                  dbName: existingFullName,
                  dbId: existing.member_id,
                  matchType: isExactMatch ? 'exact' : 'intelligent',
                  action: 'skipped' // Se actualizará después según la acción tomada
                })
                
                if (isIntelligentMatch) {
                  console.log(`🎯 COINCIDENCIA INTELIGENTE: BD="${existingFullName}" | Excel="${fullName}"`)
                }
              }
              
              return isExactMatch || isIntelligentMatch
            })
          }
        } else {
          // MODO ACTUALIZAR: Prioridad matrícula; si no hay, intentar por nombre (exacto o inteligente)
          if (member.member_number && member.member_number.trim() !== '') {
            searchCriteria = `matrícula: ${member.member_number}`
            existingMember = existingMembers.find((existing: any) => 
              existing.member_number === member.member_number?.trim()
            )
          } else {
            // Intentar por nombre si no hay matrícula
            searchCriteria = `nombre: ${fullName}`
            existingMember = existingMembers.find((existing: any) => {
              const existingFullName = `${existing.first_name} ${existing.last_name}`.trim()
              const isExactMatch = existingFullName.toLowerCase() === fullName.toLowerCase()
              const isIntelligentMatch = !isExactMatch && namesMatch(existingFullName, fullName)
              
              if (isExactMatch || isIntelligentMatch) {
                nameMatches.push({
                  row: rowNumber,
                  excelName: fullName,
                  dbName: existingFullName,
                  dbId: existing.member_id,
                  matchType: isExactMatch ? 'exact' : 'intelligent',
                  action: 'skipped'
                })
                
                if (isIntelligentMatch) {
                  console.log(`🎯 COINCIDENCIA INTELIGENTE (ACTUALIZAR): BD="${existingFullName}" | Excel="${fullName}"`)
                }
              }
              
              return isExactMatch || isIntelligentMatch
            })
            
            if (!existingMember) {
              // Sin coincidencia por nombre tampoco
              console.log(`❌ MODO ACTUALIZAR: No se encontró por matrícula ni por nombre → SALTADO: "${fullName}"`)
              skipped++
              continue
            }
          }
        }

        if (existingMember) {
          const existingFullName = `${existingMember.first_name} ${existingMember.last_name}`.trim()
          console.log(`🔍 Miembro encontrado por ${searchCriteria}: BD="${existingFullName}" (ID: ${existingMember.member_id}) | Excel="${fullName}"`)
          
          
          if (importMode === 'create') {
            // MODO CREAR: Si ya existe, saltar (no duplicar)
            skipped++
            console.log(`⏭️ MODO CREAR: Socio ya existe → SALTADO: ${fullName}`)
            continue
          } else {
            // MODO ACTUALIZAR: Verificar si hay cambios ÚNICAMENTE en Index/HCP
            const hasChanges = 
              // Cambios en handicaps (ÚNICOS campos a actualizar en modo actualizar)
              (member.handicap_index !== null && existingMember.handicap_index !== member.handicap_index) ||
              (member.handicap_local !== null && existingMember.handicap_local !== member.handicap_local)
              // NO verificar nombre - no se debe actualizar en modo actualizar
            
            if (hasChanges) {
              // MODO ACTUALIZAR: Solo actualizar Index y HCP, NUNCA el nombre
              const updateData: any = {}
              const changes: string[] = []
              
              // Actualizar ÚNICAMENTE handicaps si son diferentes
              if (member.handicap_index !== null && existingMember.handicap_index !== member.handicap_index) {
                updateData.handicap_index = member.handicap_index
                changes.push(`Index: ${existingMember.handicap_index} → ${member.handicap_index}`)
                console.log(`📊 Actualizando Index: ${existingMember.handicap_index} → ${member.handicap_index}`)
              }
              if (member.handicap_local !== null && existingMember.handicap_local !== member.handicap_local) {
                updateData.handicap_local = member.handicap_local
                changes.push(`HCP: ${existingMember.handicap_local} → ${member.handicap_local}`)
                console.log(`🎯 Actualizando HCP: ${existingMember.handicap_local} → ${member.handicap_local}`)
              }
              
              // Actualizar el tracking con los cambios
              const matchIndex = nameMatches.findIndex(m => m.row === rowNumber)
              if (matchIndex >= 0) {
                nameMatches[matchIndex].action = 'updated'
                nameMatches[matchIndex].changes = changes
              }
              
              // Log para mostrar que el nombre NO se actualiza aunque sea diferente
              if (existingFullName.toLowerCase() !== fullName.toLowerCase()) {
                console.log(`ℹ️ MODO ACTUALIZAR: Nombre diferente pero NO se actualiza: BD="${existingFullName}" | Excel="${fullName}"`)
              }
              
              console.log('📤 Enviando actualización:', updateData)

              const response = await fetch(`http://localhost:8000/api/club/${clubId}/members/${existingMember.member_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
              })

              if (!response.ok) {
                const errorText = await response.text()
                console.error('Error actualizando miembro:', errorText)
                throw new Error(`Error actualizando ${member.full_name}: ${response.status} - ${errorText}`)
              }
              
              updated++
              console.log(`✅ MODO ACTUALIZAR: Actualizado Index/HCP para "${existingFullName}" (matrícula: ${member.member_number})`)
            } else {
              skipped++
              console.log(`⏭️ MODO ACTUALIZAR: Sin cambios en Index/HCP → SALTADO: ${fullName}`)
            }
          }


        } else {
          // No se encontró el miembro
          if (importMode === 'create') {
            // MODO CREAR: Crear nuevo socio
            console.log(`❌ MODO CREAR: Socio no encontrado → CREAR NUEVO: "${fullName}"`)
            const memberData = {
            firstName: firstName || '',
            lastName: lastName || '',
            memberNumber: member.member_number || '', // String vacío en lugar de null
            handicapIndex: member.handicap_index !== null ? Number(member.handicap_index) : null,
            handicapLocal: member.handicap_local !== null ? Number(member.handicap_local) : null,
            membershipType: 'full',
            membershipStatus: 'active',
            email: member.email || null,
            phone: member.phone || null
          }

          console.log('Datos a enviar para', member.full_name, ':', memberData)

          const response = await fetch(`http://localhost:8000/api/club/${clubId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberData)
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Error creando miembro:', errorText)
            throw new Error(`Error creando ${member.full_name}: ${response.status} - ${errorText}`)
          }
          
            created++
            console.log(`✅ MODO CREAR: Creado "${fullName}"`)
          } else {
            // MODO ACTUALIZAR: Socio no encontrado por matrícula
            notFound++
            console.log(`❌ MODO ACTUALIZAR: Matrícula "${member.member_number}" no encontrada → NO SE PUEDE ACTUALIZAR: "${fullName}"`)
          }
        }
      }

      // Crear resumen detallado con reporte de coincidencias
      const summary: ImportSummary = {
        created,
        updated,
        skipped,
        notFound,
        nameMatches,
        errors
      }
      
      setImportSummary(summary)
      
      // Mostrar resumen básico
      let summaryMessage = ''
      if (importMode === 'create') {
        summaryMessage = `Se crearon ${created} socios exitosamente.`
        if (skipped > 0) {
          summaryMessage += `\n\n${skipped} socios ya existían y fueron omitidos.`
        }
      } else {
        summaryMessage = `Se actualizaron ${updated} socios exitosamente.`
        if (skipped > 0) {
          summaryMessage += `\n\n${skipped} socios no tenían cambios.`
        }
        if (notFound > 0) {
          summaryMessage += `\n\n${notFound} socios no se pudieron actualizar (sin matrícula).`
        }
      }
      
      // Agregar información sobre coincidencias inteligentes
      const intelligentMatches = nameMatches.filter(m => m.matchType === 'intelligent')
      if (intelligentMatches.length > 0) {
        summaryMessage += `\n\n⚠️ ${intelligentMatches.length} coincidencias automáticas detectadas.`
        summaryMessage += `\nHaz clic en "Ver Detalles" para revisar.`
      }
      
      setSuccessMessage(summaryMessage)
      setShowSuccessModal(true)
      
      onImportSuccess()
      onClose()
      
      // Reset state
      setImportedData([])
      setValidationErrors([])
      setFileName('')
      
      // Limpiar input file
      const fileInput = document.getElementById('excel-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error) {
      console.error('Error en importación:', error)
      let errorMessage = 'Error desconocido durante la importación'
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el servidor esté funcionando.'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setValidationErrors([{ row: 0, field: 'general', message: errorMessage }])
    } finally {
      setIsProcessing(false)
    }
  }

  const removeRow = (index: number) => {
    setImportedData(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Importar Socios desde Excel</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Selector de Modo */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Modo de importación:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setImportMode('create')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  importMode === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📥 Agregar Socios
              </button>
              <button
                onClick={() => setImportMode('update')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  importMode === 'update'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📝 Actualizar Index/HCP
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Instructions */}
          <div className={`mb-4 p-3 rounded-lg ${importMode === 'create' ? 'bg-blue-50' : 'bg-green-50'}`}>
            <h3 className={`text-sm font-medium mb-2 ${importMode === 'create' ? 'text-blue-800' : 'text-green-800'}`}>
              {importMode === 'create' ? 'Formato para AGREGAR socios:' : 'Formato para ACTUALIZAR Index/HCP:'}
            </h3>
            <ul className={`text-sm space-y-1 ${importMode === 'create' ? 'text-blue-700' : 'text-green-700'}`}>
              {importMode === 'create' ? (
                <>
                  <li>• <strong>Nombre Y Apellido</strong>: Nombre completo del socio (requerido)</li>
                  <li>• <strong>Matricula</strong>: Número de matrícula (opcional pero recomendado)</li>
                  <li>• <strong>Index</strong>: Índice de handicap -10 a 72 con decimales (opcional)</li>
                  <li>• <strong>HCP</strong>: Handicap manual -10 a 72 sin decimales (opcional)</li>
                  <li>• <strong>Email</strong>: Correo electrónico (opcional)</li>
                  <li>• <strong>Teléfono</strong>: Número de teléfono (opcional)</li>
                  <li className="text-blue-600 font-medium mt-2">• Solo se crearán socios nuevos</li>
                </>
              ) : (
                <>
                  <li>• <strong>Matricula</strong>: Se usa primero para identificar; si falta, se intentará por <strong>Nombre y Apellido</strong> (también admite “Apellido, Nombre”).</li>
                  <li>• <strong>Index</strong>: Nuevo índice de handicap -10 a 72 con decimales (requerido)</li>
                  <li>• <strong>HCP</strong>: Nuevo handicap manual -10 a 72 sin decimales (requerido)</li>
                  <li className="text-green-600 font-medium mt-2">• Se actualizarán socios existentes por matrícula o por nombre si no hay matrícula.</li>
                  <li className="text-green-600 font-medium">• No se crearán socios nuevos en este modo</li>
                </>
              )}
            </ul>
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar archivo Excel
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
                disabled={isProcessing}
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {fileName || 'Haz clic para seleccionar un archivo Excel'}
                </span>
              </label>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <h3 className="text-sm font-medium text-red-800">Errores encontrados:</h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <li key={index}>
                    Fila {error.row}, {error.field}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Data */}
          {importedData.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <h3 className="text-sm font-medium text-green-800">
                  {importedData.length} socios listos para importar:
                </h3>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matrícula</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Index</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">HCP</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importedData.map((member, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {member.full_name}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{member.member_number || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {member.handicap_index != null
                              ? member.handicap_index % 1 === 0
                                ? member.handicap_index
                                : member.handicap_index.toFixed(1)
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {member.handicap_local != null ? member.handicap_local : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{member.email || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{member.phone || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeRow(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={() => {
              // Limpiar input file al cancelar
              const fileInput = document.getElementById('excel-upload') as HTMLInputElement
              if (fileInput) fileInput.value = ''
              onClose()
            }}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={importedData.length === 0 || validationErrors.length > 0 || isProcessing}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Procesando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {importMode === 'create' 
                  ? `Crear ${importedData.length} socios nuevos`
                  : `Actualizar ${importedData.length} socios existentes`
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
