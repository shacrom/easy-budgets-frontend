# Lista de Tareas: Configuración para Nuevo Cliente

Esta guía describe todos los pasos necesarios para adaptar la aplicación para un nuevo cliente.

---

## 📋 Checklist General

- [ ] Configuración de branding (logo, colores, estilo PDF)
- [ ] Configuración de email y dominio
- [ ] Configuración de Supabase (proyecto y base de datos)
- [ ] Configuración de Vercel (deployment)
- [ ] Variables de entorno
- [ ] Pruebas finales

---

## 🎨 1. Branding y Personalización Visual

### 1.1. Logo del Cliente

**Archivos a actualizar:**

- [ ] **Logo para la aplicación web**
  - Ubicación: `src/assets/logo-cliente.png`
  - Formato recomendado: PNG con fondo transparente
  - Tamaño: 200x60px (o proporción similar)
  
- [ ] **Logo para el PDF**
  - Ubicación: Definir en variable de entorno (ver más abajo)
  - Formato: PNG, JPG o SVG
  - Tamaño recomendado: 300x100px
  - Debe ser accesible por URL pública

**Pasos:**

1. Solicitar al cliente el logo en alta calidad
2. Optimizar el logo (comprimir sin perder calidad)
3. Subir el logo a una URL pública (ej: Vercel, Cloudinary, AWS S3)
4. Actualizar la variable de entorno `VITE_LOGO_URL`

---

### 1.2. Estilo Personalizado del PDF

**Archivo a modificar:** `src/app/services/pdf-export.service.ts`

- [ ] **Colores corporativos**
  ```typescript
  // Buscar en el archivo y actualizar:
  const PRIMARY_COLOR = '#2563eb'; // Cambiar por color del cliente
  const SECONDARY_COLOR = '#1e40af'; // Color secundario
  const ACCENT_COLOR = '#60a5fa'; // Color de acentos
  ```

- [ ] **Tipografía**
  ```typescript
  // Si el cliente requiere una fuente específica:
  // 1. Descargar la fuente en formato .ttf
  // 2. Colocarla en src/assets/fonts/
  // 3. Registrarla en pdfMake (ver documentación en el archivo)
  ```

- [ ] **Pie de página personalizado**
  ```typescript
  // Actualizar información de contacto en la función footer():
  footer: {
    columns: [
      { text: 'Nombre Empresa', style: 'footer' },
      { text: 'Teléfono: +34 XXX XXX XXX', style: 'footer' },
      { text: 'Email: info@cliente.com', style: 'footer' }
    ]
  }
  ```

- [ ] **Encabezado personalizado**
  - Actualizar logo en el encabezado
  - Modificar información de la empresa
  - Ajustar diseño según necesidades del cliente

---

### 1.3. Logo por Defecto del PDF

**Variable de entorno a definir:**

```env
# En .env.development y .env.production
VITE_LOGO_URL=https://tu-dominio.com/assets/logo-cliente.png
```

**Uso en el código:**

```typescript
// En pdf-export.service.ts
const logoUrl = environment.logoUrl || 'URL_POR_DEFECTO';
```

---

## 📧 2. Configuración de Email y Dominio

### 2.1. Verificar Dominio en Resend

**Prerrequisitos:**
- Tener acceso al panel DNS del dominio del cliente
- O coordinar con el departamento IT del cliente

**Pasos:**

- [ ] **Añadir dominio en Resend**
  1. Ir a https://resend.com/domains
  2. Clic en "Add Domain"
  3. Introducir el dominio del cliente (ej: `empresacliente.com`)
  4. Resend generará 3 registros DNS

- [ ] **Configurar registros DNS**
  
  Añadir estos registros en el panel DNS del dominio:

  **Registro SPF:**
  - Tipo: `TXT`
  - Nombre: `@` o `empresacliente.com`
  - Valor: `v=spf1 include:_spf.resend.com ~all`
  - TTL: `3600`

  **Registro DKIM:**
  - Tipo: `TXT`
  - Nombre: `resend._domainkey` (o el que indique Resend)
  - Valor: `[valor largo proporcionado por Resend]`
  - TTL: `3600`

  **Registro DMARC:**
  - Tipo: `TXT`
  - Nombre: `_dmarc`
  - Valor: `v=DMARC1; p=none; rua=mailto:admin@empresacliente.com`
  - TTL: `3600`

- [ ] **Esperar verificación**
  - Tiempo de propagación: 24-72 horas
  - Verificar en Resend dashboard que aparezca el check verde

- [ ] **Actualizar Edge Function**
  
  **Archivo:** `supabase/functions/send-budget-email/index.ts`
  
  La Edge Function ya usa una variable de entorno para el email remitente.
  
  **Configurar el email remitente:**
  
  ```powershell
  # Formato: "Nombre <email@dominio.com>"
  supabase secrets set EMAIL_FROM="Presupuestos <presupuestos@empresacliente.com>"
  ```
  
  **Verificar configuración:**
  ```powershell
  supabase secrets list
  # Debe aparecer: EMAIL_FROM
  ```
  
  **Valor por defecto:** Si no se configura, usará `"Easy Budgets <onboarding@resend.dev>"`

- [ ] **Re-desplegar la función**
  ```powershell
  supabase functions deploy send-budget-email
  ```

---

### 2.2. Configurar API Key de Resend

- [ ] **Crear/Actualizar API Key**
  1. Ir a https://resend.com/api-keys
  2. Crear nueva API key para el cliente
  3. Copiar la key (empieza con `re_`)

- [ ] **Configurar secret en Supabase**
  ```powershell
  supabase secrets set RESEND_API_KEY="re_NUEVA_API_KEY_DEL_CLIENTE"
  ```

- [ ] **Verificar que el secret está configurado**
  ```powershell
  supabase secrets list
  ```

---

## 🗄️ 3. Configuración de Supabase (Nuevo Proyecto)

### 3.1. Crear Proyecto de Supabase

- [ ] **Crear nuevo proyecto**
  1. Ir a https://supabase.com/dashboard
  2. Clic en "New Project"
  3. Nombre: `easy-budgets-[nombre-cliente]`
  4. Región: Elegir la más cercana al cliente
  5. Contraseña de BD: Guardar en lugar seguro

- [ ] **Anotar credenciales**
  - Project URL: `https://[project-id].supabase.co`
  - Anon Key: `eyJ...`
  - Service Role Key: `eyJ...` (¡SECRETO! No exponer)

---

### 3.2. Configurar Base de Datos

- [ ] **Ejecutar migraciones**
  
  Opción A - Desde local:
  ```powershell
  # Vincular proyecto
  supabase link --project-ref [project-id]
  
  # Aplicar migraciones
  supabase db push
  ```

  Opción B - Desde dashboard:
  1. Ir a SQL Editor en Supabase dashboard
  2. Copiar contenido de `database/schema.sql`
  3. Ejecutar script completo

- [ ] **Verificar tablas creadas**
  - Ir a Table Editor en Supabase
  - Verificar que existen: Budgets, Customers, Products, EmailLogs, etc.

---

### 3.3. Desplegar Edge Function

- [ ] **Configurar secretos**
  ```powershell
  # API Key de Resend
  supabase secrets set RESEND_API_KEY="re_xxxxx"
  
  # Email remitente (desde dominio verificado)
  supabase secrets set EMAIL_FROM="Presupuestos <presupuestos@empresacliente.com>"
  
  # Verificar
  supabase secrets list
  ```

- [ ] **Desplegar función**
  ```powershell
  supabase functions deploy send-budget-email
  ```

- [ ] **Verificar que está activa**
  ```powershell
  supabase functions list
  # Debe aparecer: send-budget-email | ACTIVE
  ```

---

### 3.4. Configurar Políticas de Seguridad (RLS)

- [ ] **Revisar Row Level Security**
  - Ir a Authentication > Policies en Supabase
  - Verificar que las políticas RLS estén configuradas
  - Ajustar según necesidades de seguridad del cliente

---

## ☁️ 4. Configuración de Vercel (Deployment)

### 4.1. Crear Proyecto en Vercel

- [ ] **Importar repositorio**
  1. Ir a https://vercel.com/new
  2. Importar repositorio Git
  3. Nombre: `easy-budgets-[nombre-cliente]`

- [ ] **Configurar framework**
  - Framework Preset: `Angular`
  - Build Command: `ng build --configuration=production`
  - Output Directory: `dist/easy-budgets-frontend/browser`

---

### 4.2. Variables de Entorno en Vercel

- [ ] **Añadir variables de entorno**
  
  En Vercel Dashboard → Project Settings → Environment Variables:

  ```env
  # Supabase
  VITE_SUPABASE_URL=https://[project-id].supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  
  # Logo del cliente (URL pública)
  VITE_LOGO_URL=https://cdn.ejemplo.com/logo-cliente.png
  
  # Nombre del cliente (opcional)
  VITE_CLIENT_NAME=Nombre Empresa Cliente
  
  # Email de contacto (opcional)
  VITE_SUPPORT_EMAIL=soporte@empresacliente.com
  ```

- [ ] **Aplicar a todos los entornos**
  - Production: ✓
  - Preview: ✓
  - Development: ✓

---

### 4.3. Configurar Dominio Personalizado (Opcional)

- [ ] **Añadir dominio del cliente**
  1. Vercel Dashboard → Domains
  2. Add Domain: `presupuestos.empresacliente.com`
  3. Configurar registros DNS según instrucciones de Vercel:
     - Tipo `A`: apuntar a IPs de Vercel
     - O tipo `CNAME`: apuntar a `cname.vercel-dns.com`

- [ ] **Verificar SSL**
  - Vercel configura SSL automáticamente
  - Verificar que el candado verde aparezca en el navegador

---

## 🔧 5. Variables de Entorno Locales

### 5.1. Archivos de Entorno

**Archivo:** `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'https://[project-id].supabase.co',
  supabaseAnonKey: 'eyJ...',
  logoUrl: 'https://cdn.ejemplo.com/logo-cliente.png',
  clientName: 'Nombre Empresa Cliente',
  supportEmail: 'soporte@empresacliente.com'
};
```

**Archivo:** `src/environments/environment.dev.ts`

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://[project-id-dev].supabase.co', // Proyecto de desarrollo
  supabaseAnonKey: 'eyJ...',
  logoUrl: 'http://localhost:4200/assets/logo-cliente.png',
  clientName: 'Nombre Empresa Cliente [DEV]',
  supportEmail: 'dev@ejemplo.com'
};
```

---

### 5.2. Archivo .env (para desarrollo local)

**Archivo:** `.env` (crear en raíz del proyecto, **NO** commitear a Git)

```env
# Supabase
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Resend (solo para testing local de Edge Functions)
RESEND_API_KEY=re_xxxxx

# Cliente
VITE_LOGO_URL=http://localhost:4200/assets/logo-cliente.png
VITE_CLIENT_NAME=Nombre Empresa Cliente
VITE_SUPPORT_EMAIL=soporte@empresacliente.com
```

**IMPORTANTE:** Añadir `.env` al `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
```

---

## 🧪 6. Pruebas Finales

### 6.1. Pruebas Locales

- [ ] **Compilar proyecto**
  ```powershell
  ng build --configuration=production
  ```

- [ ] **Ejecutar tests**
  ```powershell
  npm run test
  ```

- [ ] **Verificar funcionalidad**
  - [ ] Login/Registro funciona
  - [ ] Crear presupuesto
  - [ ] Generar PDF con logo correcto
  - [ ] Enviar email de prueba
  - [ ] Verificar estilos personalizados

---

### 6.2. Pruebas en Staging/Preview

- [ ] **Deploy de Preview en Vercel**
  - Crear PR en GitHub
  - Vercel creará deploy de preview automáticamente

- [ ] **Pruebas en Preview**
  - [ ] Verificar logo se muestra correctamente
  - [ ] Crear presupuesto de prueba
  - [ ] Enviar email de prueba a email del cliente
  - [ ] Verificar que el PDF tiene el estilo correcto
  - [ ] Verificar que el email llega desde el dominio del cliente

---

### 6.3. Pruebas en Producción

- [ ] **Deploy a producción**
  - Merge del PR a `main`
  - Vercel desplegará automáticamente

- [ ] **Smoke tests**
  - [ ] Visitar dominio de producción
  - [ ] Crear presupuesto real
  - [ ] Enviar email de prueba al cliente
  - [ ] Verificar con el cliente que todo funciona

---

## 📞 7. Información a Solicitar al Cliente

### 7.1. Antes de Empezar

- [ ] **Branding**
  - Logo en alta calidad (PNG con transparencia)
  - Colores corporativos (códigos HEX)
  - Tipografía corporativa (si aplica)

- [ ] **Dominio**
  - Nombre del dominio: `empresacliente.com`
  - Acceso al panel DNS (o coordinar con IT)
  - Email desde el que quieren enviar presupuestos (ej: `presupuestos@empresacliente.com`)

- [ ] **Información de contacto**
  - Razón social completa
  - Dirección fiscal
  - Teléfono de contacto
  - Email de soporte
  - CIF/NIF

- [ ] **Hosting/Dominio personalizado (opcional)**
  - Si quieren un subdominio personalizado para la app
  - Ejemplo: `presupuestos.empresacliente.com`

---

### 7.2. Durante la Configuración

- [ ] **Verificación de email**
  - Proporcionar email de prueba del cliente
  - Confirmar recepción de emails de prueba

- [ ] **Aprobación de diseño**
  - Mostrar PDF de ejemplo
  - Confirmar colores y estilo
  - Aprobar logo y posicionamiento

---

## 🔒 8. Seguridad y Credenciales

### 8.1. Gestión de Secretos

- [ ] **Nunca commitear a Git:**
  - `.env` files
  - API keys
  - Passwords de base de datos
  - Service role keys

- [ ] **Usar gestores de contraseñas:**
  - 1Password, Bitwarden, LastPass, etc.
  - Guardar todas las credenciales del cliente en una bóveda segura

- [ ] **Documentar credenciales:**
  - Crear entrada en gestor de contraseñas con:
    - Nombre del cliente
    - Supabase Project ID
    - Supabase URL
    - Resend API Key
    - Vercel Project URL
    - Accesos DNS (si aplica)

---

### 8.2. Accesos y Permisos

- [ ] **Supabase:**
  - Invitar al cliente como miembro del proyecto (opcional)
  - Rol: Read-only para el cliente

- [ ] **Vercel:**
  - Invitar al cliente como miembro del proyecto (opcional)
  - Rol: Viewer

- [ ] **Resend:**
  - Mantener cuenta bajo tu control
  - O crear cuenta separada para el cliente

---

## 📝 9. Documentación para el Cliente

### 9.1. Manual de Usuario

- [ ] **Crear guía básica de uso:**
  - Cómo crear un presupuesto
  - Cómo enviar por email
  - Cómo exportar PDF
  - Preguntas frecuentes

- [ ] **Video tutorial (opcional):**
  - Grabación de pantalla mostrando el flujo completo
  - Subir a YouTube (unlisted) o Loom

---

### 9.2. Documentación Técnica

- [ ] **Información de mantenimiento:**
  - URLs de servicios (Supabase, Vercel, Resend)
  - Contacto de soporte técnico
  - Procedimiento para cambios de branding
  - Política de backups

---

## ✅ Checklist Final

Una vez completados todos los pasos anteriores:

- [ ] Todas las variables de entorno configuradas
- [ ] Logo del cliente visible en app y PDF
- [ ] Emails se envían desde dominio del cliente
- [ ] Dominio personalizado configurado (si aplica)
- [ ] Pruebas completas realizadas
- [ ] Cliente ha probado y aprobado la aplicación
- [ ] Documentación entregada
- [ ] Credenciales guardadas de forma segura
- [ ] Backup de la base de datos configurado
- [ ] Monitoreo configurado (opcional: Sentry, LogRocket)

---

## 🚀 Comandos Rápidos de Referencia

```powershell
# Vincular proyecto de Supabase
supabase link --project-ref [project-id]

# Ver secretos configurados
supabase secrets list

# Configurar secrets
supabase secrets set RESEND_API_KEY="re_xxxxx"
supabase secrets set EMAIL_FROM="Presupuestos <presupuestos@empresacliente.com>"

# Aplicar migraciones
supabase db push

# Desplegar Edge Function
supabase functions deploy send-budget-email

# Ver logs de la función
supabase functions logs send-budget-email

# Build para producción
ng build --configuration=production

# Verificar configuración
.\check-email.ps1
```

---

## 📚 Recursos Adicionales

- [Documentación Supabase](https://supabase.com/docs)
- [Documentación Resend](https://resend.com/docs)
- [Documentación Vercel](https://vercel.com/docs)
- [Guía de configuración DNS](https://resend.com/docs/dashboard/domains/introduction)
- [RESEND_QUICKSTART.md](./RESEND_QUICKSTART.md) - Guía rápida de email
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Configuración de Supabase

---

**Última actualización:** Diciembre 2025
