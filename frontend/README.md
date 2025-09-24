# 🌐 Frontend - TeeTracker Pro

Aplicación React moderna para gestión de torneos de golf.

## 🚀 Desarrollo

```bash
npm install
npm run dev
```

## 📁 Estructura

```
src/
├── components/         # Componentes reutilizables
│   ├── ActivityItem.tsx
│   ├── ClubCard.tsx
│   ├── CreateTournamentModal.tsx
│   └── ...
├── pages/             # Páginas principales
│   ├── Dashboard.tsx
│   ├── ClubAdmin.tsx
│   ├── ScorecardPlayerSelection.tsx
│   └── ...
├── hooks/             # Custom hooks
│   ├── useClubs.ts
│   ├── useTournaments.ts
│   └── ...
├── services/          # API services
│   ├── clubService.ts
│   ├── tournamentService.ts
│   └── ...
├── types/             # TypeScript definitions
│   ├── club.ts
│   ├── tournament.ts
│   └── ...
└── utils/             # Utilidades
    ├── dateFormatter.ts
    └── teeSelection.ts
```

## 🛠️ Tecnologías

- **React 18** con TypeScript
- **Vite** para build y dev server
- **Tailwind CSS** para estilos
- **React Query** para estado servidor
- **React Router** para navegación

## 🎨 Estilos

Usando Tailwind CSS con configuración personalizada:
- Colores del tema golf
- Componentes reutilizables
- Responsive design

## 📱 Páginas Principales

1. **Dashboard** - Resumen del sistema
2. **ClubAdmin** - Administración de club
3. **ScorecardPlayerSelection** - Selección de jugadores
4. **ManualScorecardEntry** - Entrada de scores
5. **TournamentResults** - Resultados finales

## 🔗 APIs

El frontend se comunica con el backend en `localhost:8000`:

```typescript
// Ejemplo de servicio
export const getClubs = async () => {
  const response = await fetch('/api/system/clubs');
  return response.json();
};
```

## 🧪 Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
```

## 📦 Build

```bash
npm run build       # Compilar para producción
npm run preview     # Preview de build
```
