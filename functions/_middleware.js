export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const PROTECTED = ['/admin.html', '/save'];

  if (PROTECTED.includes(url.pathname)) {
    const auth = request.headers.get('Authorization') || '';
    const [scheme, encoded] = auth.split(' ');

    if (scheme === 'Basic' && encoded) {
      try {
        const [user, pass] = atob(encoded).split(':');
        const expectedPass = env.ADMIN_PASSWORD;

        if (!expectedPass) {
          return new Response('Server misconfigured: ADMIN_PASSWORD not set', { status: 500 });
        }

        if (user === 'admin' && pass === expectedPass) {
          return next();
        }
      } catch {
        // bad base64
      }
    }

    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Ego Spa Admin", charset="UTF-8"' },
    });
  }

  return next();
}
