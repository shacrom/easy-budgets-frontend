# Configuración Rápida de Resend

## Pasos para Activar el Envío de Emails

### 1. Crear Cuenta en Resend (REQUERIDO)

1. Ve a [https://resend.com/signup](https://resend.com/signup)
2. Crea una cuenta gratuita (puedes usar tu email o GitHub)
3. Verifica tu email

### 2. Obtener API Key

1. Una vez dentro del dashboard, ve a [API Keys](https://resend.com/api-keys)
2. Haz clic en "Create API Key"
3. Dale un nombre descriptivo: "Easy Budgets Dev"
4. **Copia la API key** (comienza con `re_...`) - **Solo se muestra una vez**

### 3. Configurar el Secret en Supabase

Ejecuta este comando en la terminal (reemplaza `re_xxxxx` con tu API key real):

```bash
supabase secrets set RESEND_API_KEY="re_xxxxx"
```

### 4. Re-desplegar la Edge Function

Después de configurar el secret, re-despliega la función:

```bash
supabase functions deploy send-budget-email
```

### 5. Probar el Envío

1. Ve al editor de presupuestos
2. Haz clic en "Enviar por Email"
3. Introduce un email de prueba
4. Haz clic en "Enviar Email"

### Verificación de Problemas

Si aparece el error `Edge Function returned a non-2xx status code`, verifica:

1. **La API key está configurada:**
   ```bash
   supabase secrets list
   ```
   Debería aparecer `RESEND_API_KEY` en la lista.

2. **La API key es válida:**
   - Ve a [Resend Dashboard](https://resend.com/api-keys)
   - Verifica que la API key esté activa
   - Si no estás seguro, crea una nueva y vuelve a configurar el secret

3. **Revisa la consola del navegador:**
   - Abre las DevTools (F12)
   - Ve a la pestaña "Console"
   - Intenta enviar un email de nuevo
   - Los logs mostrarán más detalles del error

### ⚠️ LIMITACIÓN IMPORTANTE del Tier Gratuito

**Solo puedes enviar emails de prueba a TU PROPIA dirección de email** (la que usaste para registrarte en Resend).

Si intentas enviar a otro email, verás este error:
```
You can only send testing emails to your own email address (tu-email@ejemplo.com)
```

**Soluciones:**
1. **Para pruebas**: Usa siempre tu propio email como destinatario
2. **Para producción**: Verifica un dominio propio en https://resend.com/domains
3. **Alternativa**: Actualiza al plan de pago ($20/mes)

### Otras Limitaciones del Tier Gratuito

- **100 emails/día** desde `onboarding@resend.dev`
- **3,000 emails/mes**
- **40 MB máximo** por adjunto
- Los emails pueden ir a spam hasta que configures un dominio propio

### ¿Primer Email de Prueba?

Para tu primer envío de prueba, usa:
- **Destinatario:** **TU PROPIO EMAIL** (el que usaste en Resend - ej: marmibas.dev@gmail.com)
- **Asunto:** Prueba de presupuesto
- **Mensaje:** Email de prueba

⚠️ **IMPORTANTE**: En el tier gratuito, solo puedes enviar emails a tu propia dirección. Si intentas enviar a otro email, Resend rechazará el envío.

**Nota:** El email puede tardar 1-2 minutos en llegar y puede ir a la carpeta de spam la primera vez.

### Siguiente Paso: Dominio Personalizado (REQUERIDO para Producción)

⚠️ **Para poder enviar emails a clientes reales, DEBES verificar un dominio.**

#### ¿Por qué verificar un dominio?

1. **Poder enviar a cualquier dirección** (no solo a tu email)
2. **Mejor deliverability** (menos probabilidad de ir a spam)
3. **Email profesional**: `presupuestos@tuempresa.com` en lugar de `onboarding@resend.dev`
4. **Mayor credibilidad** para tus clientes

#### Pasos para Verificar un Dominio

1. **Tener un dominio propio**
   - Si no tienes uno, puedes comprarlo en: Namecheap, GoDaddy, Google Domains, etc.
   - Costo aproximado: $10-15/año

2. **Añadir el dominio en Resend**
   - Ve a https://resend.com/domains
   - Haz clic en **"Add Domain"**
   - Introduce tu dominio (ej: `tuempresa.com`)

3. **Configurar registros DNS**
   Resend te dará 3 registros DNS que debes añadir:
   - **SPF** (TXT record)
   - **DKIM** (TXT record)  
   - **DMARC** (TXT record)

   Ve al panel de control de tu proveedor de dominio (donde lo compraste) y añade estos registros.

4. **Esperar verificación**
   - La verificación puede tardar entre 24-72 horas
   - Resend te enviará un email cuando esté listo

5. **Actualizar la Edge Function**
   Una vez verificado el dominio, actualiza el remitente en `supabase/functions/send-budget-email/index.ts`:
   
   ```typescript
   from: 'Presupuestos <presupuestos@tuempresa.com>',
   ```
   
   Luego re-despliega:
   ```bash
   supabase functions deploy send-budget-email
   ```

#### Alternativa: Plan de Pago sin Dominio

Si no quieres configurar un dominio propio, puedes actualizar al plan de pago de Resend ($20/mes) que permite enviar desde `onboarding@resend.dev` a cualquier dirección.

---

## Error Actual: "RESEND_API_KEY is not set" o "non-2xx status"

**CAUSA:** La API key de Resend no está configurada o no es válida.

**SOLUCIÓN:**
1. Crea cuenta en Resend
2. Obtén tu API key
3. Configúrala: `supabase secrets set RESEND_API_KEY="re_xxxxx"`
4. Re-despliega: `supabase functions deploy send-budget-email`
