import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en Supabase secrets' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  let body: { image_base64: string; media_type?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const { image_base64, media_type = 'image/jpeg' } = body;
  if (!image_base64) {
    return new Response(JSON.stringify({ error: 'image_base64 es requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const prompt = `Analizá este ticket de supermercado/comercio argentino.
Extraé cada producto comprado con estos campos:
- nombre (string, en español, limpio — sin códigos de barra, sin abreviaturas raras, capitalizado)
- cantidad (number, default 1)
- precio_unitario (number, precio por unidad en pesos argentinos)
- tema (string, una de estas categorías: Alimentos, Bebidas, Limpieza, Higiene, Mascotas, Verdulería, Carnicería, Panadería, Lácteos, Congelados, General)

Reglas:
- Ignorá subtotales, totales, impuestos, descuentos globales, datos del local y datos del cliente
- Si hay descuento sobre un ítem, usá el precio ya descontado como precio_unitario
- Si un ítem tiene cantidad x precio, calculá el precio_unitario
- Devolvé SOLO un JSON array válido, sin texto adicional, sin markdown, sin explicaciones

Ejemplo de output:
[{"nombre":"Leche entera La Serenísima","cantidad":2,"precio_unitario":1250,"tema":"Lácteos"},{"nombre":"Jabón Dove","cantidad":1,"precio_unitario":890,"tema":"Higiene"}]`;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'Error de Anthropic API', detail: err }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const anthropicData = await anthropicRes.json();
  const text = anthropicData.content?.[0]?.text ?? '';

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    return new Response(JSON.stringify({ error: 'No se pudo extraer el JSON de la respuesta', raw: text }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  let items;
  try {
    items = JSON.parse(match[0]);
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido en respuesta', raw: text }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  return new Response(JSON.stringify({ items }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
});
