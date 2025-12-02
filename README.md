# Easy Budgets Frontend

Aplicación web para gestión de presupuestos de reformas (cocinas, baños y reformas integrales).

## 🚀 Tecnologías

- **Frontend**: Angular 20+ con Signals y Standalone Components
- **Base de datos**: Supabase (PostgreSQL)
- **Generación PDF**: Puppeteer
- **Estilos**: CSS + Material Icons (MUI)

## 📋 Prerequisitos

- Node.js (v18 o superior)
- npm o yarn
- Cuenta en [Supabase](https://supabase.com)

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/shacrom/easy-budgets-frontend.git
cd easy-budgets-frontend

# Instalar dependencias
npm install

# Instalar Supabase CLI globalmente
npm install -g supabase
```

## 🔐 Configuración

### 1. Variables de Entorno

Crea archivos `.env` para cada entorno:

**`.env.development`**
```env
SUPABASE_URL=https://tu-proyecto-develop.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-develop
```

**`.env.production`**
```env
SUPABASE_URL=https://tu-proyecto-main.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-main
```

### 2. Supabase CLI

```bash
# Login en Supabase
supabase login

# Listar proyectos
supabase projects list

# Vincular proyecto de develop
supabase link --project-ref <tu-project-ref-develop>
```

## 🗄️ Base de Datos - Comandos Supabase

### Migraciones

```bash
# Crear nueva migración
supabase migration new nombre_descriptivo

# Aplicar migraciones pendientes a base de datos remota
supabase db push

# Ver estado de migraciones
supabase migration list

# Traer cambios remotos y crear migración local
supabase db pull

# Ver diferencias entre local y remoto
supabase db diff
```

### Generar Tipos TypeScript

```bash
# Generar tipos desde base de datos vinculada
supabase gen types typescript --linked > src/types/supabase.types.ts

# O desde proyecto específico
supabase gen types typescript --project-id <project-ref> > src/types/supabase.types.ts
```

### Cambiar entre Entornos

```bash
# Vincular a develop
supabase link --project-ref <project-ref-develop>

# Vincular a main (producción)
supabase link --project-ref <project-ref-main>
```

## 🏃 Desarrollo

```bash
# Iniciar servidor de desarrollo
npm start

# Ejecutar tests
npm test

# Build para producción
npm run build
```

## 📦 Scripts NPM Disponibles

```json
{
  "start": "ng serve",
  "build": "ng build",
  "test": "ng test",
  
  "db:migration:new": "supabase migration new",
  "db:push": "supabase db push",
  "db:pull": "supabase db pull",
  "db:diff": "supabase db diff",
  "db:reset": "supabase db reset",
  "db:types": "supabase gen types typescript --linked > src/types/supabase.types.ts",
  
  "db:link:develop": "supabase link --project-ref %SUPABASE_PROJECT_REF_DEVELOP%",
  "db:link:main": "supabase link --project-ref %SUPABASE_PROJECT_REF_MAIN%",
  
  "db:deploy:develop": "npm run db:link:develop && npm run db:push && npm run db:types",
  "db:deploy:main": "npm run db:link:main && npm run db:push && npm run db:types"
}
```

## 🔄 Flujo de Trabajo con Migraciones

### En Develop

1. Crear migración:
   ```bash
   npm run db:migration:new nombre_cambio
   ```

2. Editar archivo SQL generado en `supabase/migrations/`

3. Aplicar cambios a base de datos de develop:
   ```bash
   npm run db:push
   ```

4. Generar tipos TypeScript actualizados:
   ```bash
   npm run db:types
   ```

5. Commit y push:
   ```bash
   git add supabase/migrations/ src/types/
   git commit -m "feat(db): descripción del cambio"
   git push origin develop
   ```

### En Main (Producción) - Automatizado ✨

1. Merge de develop a main:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **¡GitHub Actions se encarga del resto!** 🎉
   - Detecta cambios en `supabase/migrations/`
   - Aplica migraciones automáticamente
   - Genera tipos TypeScript actualizados
   - Hace commit de los tipos

3. Verificar el workflow en la pestaña **Actions** de GitHub

#### Despliegue Manual (si es necesario)

Si prefieres desplegar manualmente o GitHub Actions falla:

```bash
npm run db:deploy:main
```

Este comando vincula, aplica migraciones y genera tipos en un solo paso.

## 📐 Convenciones de Base de Datos

- **Tablas**: PascalCase (ej: `Customers`, `Budgets`)
- **Columnas**: camelCase (ej: `budgetId`, `createdAt`)
- Usar comillas dobles para preservar case-sensitivity en PostgreSQL

## 🗂️ Estructura del Proyecto

```
easy-budgets-frontend/
├── .github/
│   ├── workflows/
│   │   └── deploy-db-migrations.yml  # GitHub Actions para producción
│   └── SETUP_SECRETS.md              # Guía de configuración de secrets
├── src/
│   ├── app/
│   │   ├── features/          # Módulos por funcionalidad
│   │   ├── models/            # Interfaces y tipos
│   │   ├── services/          # Servicios de Angular
│   │   └── shared/            # Componentes compartidos
│   ├── types/
│   │   └── supabase.types.ts  # Tipos generados automáticamente
│   └── environments/
├── supabase/
│   ├── config.toml
│   └── migrations/            # Migraciones SQL versionadas
├── database/
│   ├── migrations/            # Migraciones legacy (referencia)
│   └── seeds/                 # Datos de prueba
└── README.md
```

## 🤖 GitHub Actions - Despliegue Automático

El proyecto incluye un workflow de GitHub Actions que automatiza el despliegue de migraciones a producción.

### Configuración Inicial (Solo una vez)

Sigue la guía completa en [`.github/SETUP_SECRETS.md`](.github/SETUP_SECRETS.md) para:

1. Obtener tu Access Token de Supabase
2. Obtener tu Project Reference ID de producción
3. Configurar los secrets en GitHub

### ¿Cómo Funciona?

Cuando haces push a `main` con cambios en `supabase/migrations/`:

1. ✅ GitHub Actions detecta los cambios automáticamente
2. ✅ Se conecta a tu base de datos de producción
3. ✅ Aplica las migraciones pendientes
4. ✅ Genera tipos TypeScript actualizados
5. ✅ Hace commit automático de los tipos

**No necesitas ejecutar comandos manualmente en producción** 🎉

## 📚 Documentación Adicional

- [Supabase Documentation](https://supabase.com/docs)
- [Angular Documentation](https://angular.dev)
- [Configuración de GitHub Actions](.github/SETUP_SECRETS.md)
- [Configuración Supabase](./SUPABASE_SETUP.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y confidencial.
