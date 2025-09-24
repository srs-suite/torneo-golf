# 🤝 Guía de Contribución - TeeTracker Pro

## 📋 Antes de Empezar

1. **Leer** el README.md principal
2. **Configurar** el entorno de desarrollo
3. **Probar** que el sistema funcione correctamente

## 🛠️ Configuración de Desarrollo

### 1. Clonar y Configurar
```bash
git clone <repo-url>
cd TeeTracker-Pro
```

### 2. Instalar Dependencias
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 3. Configurar Base de Datos
```sql
CREATE DATABASE teetracker_pro;
-- Importar schema desde database/database_schema.sql
```

### 4. Iniciar Desarrollo
```bash
.\INICIAR_SISTEMA.bat
```

## 📁 Estructura de Ramas

- **main** - Código en producción
- **develop** - Rama de desarrollo
- **feature/nombre** - Nuevas funcionalidades
- **hotfix/nombre** - Arreglos urgentes

## 💻 Estándares de Código

### Frontend (TypeScript/React)
```typescript
// ✅ Buenas prácticas
interface TournamentProps {
  tournamentId: number;
  onUpdate?: () => void;
}

const Tournament: React.FC<TournamentProps> = ({ tournamentId, onUpdate }) => {
  // Usar hooks de React Query
  const { data: tournament } = useTournament(tournamentId);
  
  return (
    <div className="tournament-card">
      {/* JSX aquí */}
    </div>
  );
};
```

### Backend (Node.js/ES6)
```javascript
// ✅ Buenas prácticas
export const getTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await getTournamentById(tournamentId);
    
    res.json({ success: true, data: tournament });
  } catch (error) {
    console.error('Error getting tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## 🗃️ Base de Datos

### Convenciones
- **Tablas:** snake_case (ej: `tournament_participants`)
- **Columnas:** snake_case (ej: `created_at`)
- **Llaves primarias:** `table_id` (ej: `tournament_id`)

### Migraciones
```sql
-- Nuevo archivo: database/YYYY-MM-DD_descripcion.sql
ALTER TABLE tournaments 
ADD COLUMN new_field VARCHAR(255) DEFAULT NULL;
```

## 🧪 Testing

### Frontend
```bash
cd frontend
npm run test            # Unit tests
npm run test:coverage   # Coverage report
```

### Backend
```bash
npm run test:backend    # API tests
npm run test:db         # Database tests
```

## 📝 Commits

### Formato
```
tipo(scope): descripción

feat(tournaments): añadir cálculo automático de handicaps
fix(scorecard): corregir validación de scores
docs(readme): actualizar instrucciones de instalación
```

### Tipos
- **feat:** Nueva funcionalidad
- **fix:** Corrección de bug
- **docs:** Documentación
- **style:** Formato de código
- **refactor:** Refactorización
- **test:** Tests
- **chore:** Tareas de mantenimiento

## 🔍 Pull Requests

### Checklist
- [ ] Código testeado localmente
- [ ] Tests unitarios pasando
- [ ] Documentación actualizada
- [ ] Sin conflictos de merge
- [ ] Descripción clara del cambio

### Template
```markdown
## 📋 Descripción
Breve descripción de los cambios

## 🔧 Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Documentación

## ✅ Testing
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Probado manualmente

## 📸 Screenshots
(Si aplica)
```

## 🚨 Resolución de Problemas

### Backend No Inicia
1. Verificar MySQL corriendo
2. Revisar `database_config.js`
3. Verificar puerto 8000 libre

### Frontend No Carga
1. Verificar `npm install` en frontend/
2. Revisar puerto 5173 libre
3. Verificar `index.html` existe

### Errores de Tailwind
1. Verificar `tailwind.config.js`
2. Verificar `postcss.config.js`
3. Reiniciar dev server

## 📞 Soporte

1. **Issues:** Crear issue en GitHub con template
2. **Discussions:** Para preguntas generales
3. **Wiki:** Documentación detallada

---

¡Gracias por contribuir a TeeTracker Pro! 🏌️‍♂️
