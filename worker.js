export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Auth check for admin and save
    if (url.pathname === '/admin' || url.pathname === '/admin.html' || url.pathname === '/save') {
      const auth = request.headers.get('Authorization') || '';
      const [scheme, encoded] = auth.split(' ');
      let ok = false;
      if (scheme === 'Basic' && encoded) {
        try {
          const [user, pass] = atob(encoded).split(':');
          if (user === 'admin' && pass === env.ADMIN_PASSWORD) ok = true;
        } catch {}
      }
      if (!ok) {
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Ego Spa Admin"' }
        });
      }
    }

    // POST /save — сохранить в KV
    if (url.pathname === '/save' && request.method === 'POST') {
      const body = await request.json();
      await env.EGO_DATA.put('data', JSON.stringify(body));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // GET /data.json — из KV или статика
    if (url.pathname === '/data.json') {
      const stored = await env.EGO_DATA.get('data');
      if (stored) {
        return new Response(stored, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // fallthrough to static
    }

    // Всё остальное — статические файлы
    return env.ASSETS.fetch(request);
  }
}
