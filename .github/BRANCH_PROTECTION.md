# 🔒 Configuración de Protección de Ramas

Esta guía te ayudará a configurar la protección de la rama `main` para evitar pushes directos accidentales.

## ⚙️ Configuración en GitHub

### 1. Acceder a Configuración de Ramas

Ve a: https://github.com/shacrom/easy-budgets-frontend/settings/branches

### 2. Crear Regla de Protección para `main`

Click en **"Add branch protection rule"** o **"Add rule"**

### 3. Configuración Recomendada

**Branch name pattern:**
```
main
```

**Configuración de protección:**

#### ✅ Require a pull request before merging
- ☐ **Require approvals:** 0 (no necesitas aprobaciones trabajando solo)
- ☐ Dismiss stale pull request approvals when new commits are pushed
- ☐ Require review from Code Owners

**Resultado:** Bloquea `git push origin main` directo, obliga a usar Pull Requests

#### ✅ Require status checks to pass before merging
- ☑ **Require branches to be up to date before merging**

**Status checks that are required (marca estos):**
- ☑ `test` (workflow de CI con tests)
- ☑ `build` (workflow de CI con build)
- ☑ `deploy-migrations` (solo si hay cambios en migraciones)

**Resultado:** No puedes mergear si los tests o el build fallan

#### Otras opciones (recomendadas):

☑ **Require conversation resolution before merging**
- Asegura que todos los comentarios estén resueltos

☑ **Require linear history**
- Mantiene el historial de commits limpio

☐ **Include administrators** (DESACTIVADO)
- **Te permite saltarte las reglas en emergencias**

#### Opciones de seguridad:

☐ **Allow force pushes** (DESACTIVADO)
- Previene reescribir el historial

☐ **Allow deletions** (DESACTIVADO)
- Previene borrar la rama main

### 4. Guardar

Click en **"Create"** al final de la página

## ✅ Resultado

Después de configurar:

### ❌ Esto ya NO funcionará:
```bash
git checkout main
git add .
git commit -m "cambio directo"
git push origin main  # ❌ ERROR: main is protected
```

Error que verás:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
```

### ✅ Flujo Correcto:

```bash
# 1. Trabajar en develop
git checkout develop
git add .
git commit -m "feat: nueva funcionalidad"
git push origin develop

# 2. Crear Pull Request en GitHub
# - Ve a tu repositorio
# - Click en "Compare & pull request"
# - Verifica los cambios
# - Click en "Create pull request"

# 3. GitHub Actions ejecuta automáticamente:
# - Tests unitarios
# - Build de producción
# - Linter

# 4. Si todo está verde (✓), mergea:
# - Click en "Merge pull request"
# - Click en "Confirm merge"

# 5. Main se actualiza automáticamente
# - Si hay migraciones, se aplican a producción
# - Tipos TypeScript se regeneran
```

## 🚨 ¿Qué hacer en caso de emergencia?

Si necesitas hacer un cambio urgente sin PR:

### Opción 1: Desactivar protección temporalmente
1. Ve a Settings > Branches
2. Click en **Edit** en la regla de `main`
3. Desmarca **"Include administrators"**
4. Guarda
5. Haz tu push urgente
6. **Vuelve a activar la protección**

### Opción 2: Crear PR express
```bash
git checkout develop
git add .
git commit -m "hotfix: arreglo urgente"
git push origin develop

# Crear PR y mergear inmediatamente (si los checks pasan)
```

## 📊 Verificar Configuración

Para verificar que la protección está activa:

```bash
# Intenta hacer push directo a main
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push origin main

# Deberías ver:
# remote: error: GH006: Protected branch update failed
```

## 🎯 Beneficios

✅ **Previene errores** - No más pushes accidentales a producción  
✅ **CI/CD automático** - Tests y builds validados antes de mergear  
✅ **Historial limpio** - Commits organizados mediante PRs  
✅ **Trazabilidad** - Cada cambio documentado en un PR  
✅ **Calidad de código** - Revisión obligatoria antes de producción

## 📝 Notas Adicionales

- Esta configuración **NO afecta** a la rama `develop`, puedes seguir haciendo push directo
- Los workflows de GitHub Actions **seguirán funcionando** normalmente
- Puedes crear PRs de `feature/*` → `develop` → `main` para mejor organización
- La protección se aplica a **todos los colaboradores** (excepto si excluyes administradores)
