export async function onRequestGet({ env, request }) {
  // Try KV first (admin saves go here)
  const stored = await env.EGO_DATA.get('data');

  if (stored) {
    return new Response(stored, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // Fall back to the static seed file bundled with the project
  return env.ASSETS.fetch(request);
}
