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

## 4. Verificación

Una vez configurados los secrets, deberías ver:

```
SUPABASE_ACCESS_TOKEN          Updated X minutes ago
SUPABASE_PROJECT_REF_MAIN      Updated X minutes ago
```

## 5. Probar el Workflow

1. Haz un cambio en alguna migración en la rama `develop`
2. Haz commit y push a `develop`
3. Merge `develop` a `main`:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
4. Ve a la pestaña **Actions** en GitHub para ver el workflow en ejecución

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
