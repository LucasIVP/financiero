# Tablero Financiero

Dashboard de finanzas personales de Lucas, compartido con su pareja Agustina. Un único `index.html` (vanilla JS + Supabase + Chart.js), publicado en GitHub Pages.

## Sistemas (confirmados)
- Repo: `LucasIVP/financiero`, rama `main`, `index.html` en la raíz. Deploy automático a GitHub Pages en cada push (`.github/workflows/static.yml`, ~15-25 s). URL: lucasivp.github.io/financiero
- Supabase project ref: `kllmmtfkjzxunrnxphoh` (nombre "Control Financiero")
- Librerías por CDN: supabase-js@2, Chart.js 4.4.1

## Reglas de trabajo (acordadas con Lucas)
1. **GitHub `main` es la fuente de verdad**, no esta carpeta. Lucas a veces pushea desde otros chats sin tocar la copia local. Antes de editar: `git fetch`/clonar y comparar con `main`; si difieren, avisarle antes de elegir base.
2. Esta carpeta se copió el 28/10/2026 SIN `.git` (el de la carpeta original tenía un `index.lock` viejo y commits de agosto). Para trabajar con git: `git clone https://github.com/LucasIVP/financiero.git` y usar su `index.html`, o `git init` + `git remote add origin ...` + `git fetch` y comparar.
3. **Verificar contra Supabase real antes de asumir cualquier dato o de hacer un backfill**: primero `SELECT`, recién después tocar. (Un backfill hecho solo por leer código ya duplicó datos una vez.)
4. Cambios finales: pushear a `main` (Lucas confirmó que está bien commitear directo, sin PR) y dejar copia local.
5. Ante una desincronización entre `pagado` y `pagado_dueno/pagado_pareja`, el agregado `pagado` (lo que se tilda a diario) es el confiable; los otros se poblaron en parte por una migración vieja.
6. Si algo del Resumen no cambia como Lucas espera, preguntarle qué espera ver antes de explicarlo como "diseño".
7. Honestidad: marcar explícitamente lo no verificado; no inventar números, commits ni referencias.

## Estructura de la app
Tabs por `goTo('vista')` → `<div id="page-{nombre}">`: dashboard (Resumen), gastos (sub-tabs Mes, Historial, Suscripciones, Recurrentes), ingresos, tarjetas, inversiones, patrimonio, compartido, compras, config.

Tablas Supabase (verificadas 28/10/2026): activos, ahorro_meta_mes, categorias, compras_items, compras_listas, compras_temas, config, cuotas, deudas, gastos, gastos_grupales, gastos_grupales_participantes, gastos_grupales_participantes_cuotas, ingresos, inversiones, pareja_limites, pareja_margen, pareja_solicitudes, parejas, patrimonio_history, prestamos_cuotas, prestamos_tc, subcategorias, tarjetas, vaquita.

- `categorias`: columna `name` (no `nombre`).
- `gastos.tipo`: `regular` / `inusual` / `ahorro`. Las categorías son texto libre por usuario (los gastos matchean por nombre, no por id).
- `gastos.divisor` + `gastos.monto_total`: opcionales, para suscripciones divididas entre N casas. `monto` siempre es la parte de Lucas (monto_total / divisor).
- `pareja_limites`: 1 fila por pareja, `limite_comida` y `cats_comida` (array, default ['Comida','Supermercado']).
- `ahorro_meta_mes`: meta de ahorro en USD por usuario y mes (`meta_usd`).
- `vaquita` SELECT policy: solo el `aportado_por` puede ver sus propias filas (corregido 28/10/2026).

## Gotchas conocidos
- `suscripcionActivaEnMes`: `fecha_fin_recurrencia` ya es `YYYY-MM-DD` completo; no concatenarle `-01`.
- Insert con `.select()` sobre `gastos` a nombre de la pareja rompe por RLS (RETURNING exige visibilidad por SELECT): generar el `id` en el cliente y no usar `.select()`.
- `Promise.all` con Supabase no rechaza en error: siempre mirar `.error` (un error se leyó como "sin categorías" y duplicó categorías).
- FK `prestamos_cuotas.gasto_id → gastos.id` es ON DELETE SET NULL; `reconciliarGastosMirrorPrestamos()` recrea espejos de cuotas sin `gasto_id`.
- Préstamos a terceros sin cuenta (sin `persona_user_id`) tienen `gasto_id` NULL a propósito.
- La API de commits/refs de GitHub dio SHAs viejos y contradictorios; para el HEAD real mirar `github.com/LucasIVP/financiero/commits/main`.
- `new Date("YYYY-MM-DD").getDate()` corre un día en Argentina (UTC-3); extraer el día del string.

## Más contexto
- `docs/historial-fixes.md`: fixes y decisiones de ago-oct 2026.
- `docs/brief_tablero_financiero_cowork_v2.md`: brief original (01/07/2026; parte quedó desactualizada, ej. bugs ya tratados).
- `backups/`: versiones viejas del `index.html` (incluye `index_antes_20261020.html`).
- `Guia_Usuario_Finanzas.docx`: guía de usuario (generada en agosto).
