# GitHub Actions - Configuración de Secrets

Para que GitHub Actions funcione correctamente, necesitas configurar los siguientes secrets:

## 1. Obtener el Access Token de Supabase

1. Ve a [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Click en **"Generate New Token"**
3. Dale un nombre descriptivo: `GitHub Actions - easy-budgets`
4. Copia el token generado (solo lo verás una vez)

## 2. Obtener el Project Reference ID

### Para el proyecto de MAIN (Producción):

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto de **producción/main**
3. Ve a **Settings** ⚙️ > **General**
4. Copia el **Reference ID** (16 caracteres alfanuméricos)

Ejemplo: `abcdefghijklmnop`

## 3. Configurar Secrets en GitHub

1. Ve a tu repositorio: https://github.com/shacrom/easy-budgets-frontend
2. Click en **Settings** > **Secrets and variables** > **Actions**
3. Click en **"New repository secret"**
4. Añade los siguientes secrets:

### Secret 1: SUPABASE_ACCESS_TOKEN

- **Name**: `SUPABASE_ACCESS_TOKEN`
- **Value**: El token que generaste en el paso 1
- Click **"Add secret"**

### Secret 2: SUPABASE_PROJECT_REF_MAIN

- **Name**: `SUPABASE_PROJECT_REF_MAIN`
- **Value**: El Reference ID de tu proyecto de producción
- Click **"Add secret"**

### Secret 3: GH_PAT (Personal Access Token)

⚠️ **Necesario para repositorios en organizaciones**

1. Ve a https://github.com/settings/tokens
2. Click en **"Generate new token (classic)"**
3. **Note**: `GitHub Actions - Easy Budgets`
4. **Expiration**: `No expiration` (o el tiempo que prefieras)
5. **Scopes**:
   - ✅ **repo** (acceso completo al repositorio)
   - ✅ **workflow**
6. Click **"Generate token"**
7. **Copia el token** (solo lo verás una vez)
8. Vuelve a los secrets del repositorio
9. **Name**: `GH_PAT`
10. **Value**: El token que copiaste
11. Click **"Add secret"**

## 4. Configurar Permisos de GitHub Actions

1. Ve a **Settings** > **Actions** > **General**
2. En **Workflow permissions**, selecciona:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Click **"Save"**

## 5. Verificación

Una vez configurados los secrets y permisos, deberías ver:

```
GH_PAT                         Updated X minutes ago
SUPABASE_ACCESS_TOKEN          Updated X minutes ago
SUPABASE_PROJECT_REF_MAIN      Updated X minutes ago
```

## 6. Probar el Workflow

1. Haz un cambio en alguna migración en la rama `develop`
2. Haz commit y push a `develop`
3. Merge `develop` a `main`:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
4. Ve a la pestaña **Actions** en GitHub para ver el workflow en ejecución

## ⚠️ Troubleshooting

### Error: "Write access to repository not granted"

Si ves este error, verifica que:

1. ✅ Has configurado **Read and write permissions** en Settings > Actions > General
2. ✅ El workflow tiene `permissions: contents: write`
3. ✅ No hay protección de rama que impida a GitHub Actions hacer push

### Solución Alternativa: Personal Access Token

Si el problema persiste, crea un Personal Access Token:

1. Ve a https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Nombre: `GitHub Actions - Easy Budgets`
4. Scope: **`repo`** (acceso completo)
5. Copia el token
6. Añádelo como secret `GH_PAT` en tu repositorio
7. Actualiza el workflow para usar `${{ secrets.GH_PAT }}` en lugar de `${{ secrets.GITHUB_TOKEN }}`

## ⚠️ Importante

- **NUNCA** compartas estos secrets públicamente
- El access token tiene acceso completo a tus proyectos de Supabase
- Si crees que un token ha sido comprometido, revócalo inmediatamente desde el dashboard de Supabase

## 🔄 Flujo Automatizado

Una vez configurado, cada vez que hagas push a `main` con cambios en `supabase/migrations/`, el workflow:

1. ✅ Detectará los cambios automáticamente
2. ✅ Se conectará a tu base de datos de producción
3. ✅ Aplicará las migraciones
4. ✅ Generará los tipos TypeScript actualizados
5. ✅ Hará commit de los tipos automáticamente

¡No tendrás que ejecutar `supabase db push` manualmente en producción nunca más! 🎉
