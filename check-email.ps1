Write-Host ''
Write-Host '=== VERIFICANDO CONFIGURACION DE EMAIL ===' -ForegroundColor Cyan
Write-Host ''
Write-Host '[1/5] Supabase CLI...' -ForegroundColor Yellow
if (Get-Command supabase -ErrorAction SilentlyContinue) { Write-Host 'OK' -ForegroundColor Green } else { Write-Host 'FALTA' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host '[2/5] Secret RESEND_API_KEY...' -ForegroundColor Yellow
$secrets = supabase secrets list 2>&1 | Out-String
if ($secrets -match 'RESEND_API_KEY') { Write-Host 'OK' -ForegroundColor Green } else { Write-Host 'FALTA - Ejecuta: supabase secrets set RESEND_API_KEY=re_xxxxx' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host '[3/5] Edge Function...' -ForegroundColor Yellow
$functions = supabase functions list 2>&1 | Out-String
if ($functions -match 'send-budget-email.*ACTIVE') { Write-Host 'OK' -ForegroundColor Green } else { Write-Host 'FALTA - Ejecuta: supabase functions deploy send-budget-email' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host '[4/5] Archivo de funcion...' -ForegroundColor Yellow
if (Test-Path 'supabase\functions\send-budget-email\index.ts') { Write-Host 'OK' -ForegroundColor Green } else { Write-Host 'FALTA' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host '[5/5] Migracion...' -ForegroundColor Yellow
if (Test-Path 'supabase\migrations\20251210161248_create_email_logs.sql') { Write-Host 'OK' -ForegroundColor Green } else { Write-Host 'NO APLICADA' -ForegroundColor Yellow }
Write-Host ''
Write-Host '=== TODO LISTO ===' -ForegroundColor Cyan
Write-Host 'Ahora necesitas:'
Write-Host '1. Crear cuenta en https://resend.com/signup'
Write-Host '2. Obtener API key en https://resend.com/api-keys'
Write-Host '3. Ejecutar: supabase secrets set RESEND_API_KEY=re_TU_KEY'
Write-Host '4. Ejecutar: supabase functions deploy send-budget-email'
Write-Host '5. Probar enviando un email'
Write-Host ''
