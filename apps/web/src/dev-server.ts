import { createServer } from 'node:http';
import { resolveLocale, t } from './i18n.js';

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const locale = resolveLocale(url.searchParams.get('lang'));

  const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t(locale, 'app.name')}</title>
    <style>
      :root { color-scheme: light; font-family: Georgia, "Noto Serif Malayalam", serif; }
      body { margin: 0; min-height: 100vh; background: linear-gradient(160deg, #f7f3ea, #e7eef2); }
      main { max-width: 40rem; margin: 0 auto; padding: 3rem 1.25rem; }
      h1 { font-size: clamp(2.5rem, 8vw, 4rem); margin: 0 0 0.5rem; letter-spacing: -0.03em; }
      p { font-size: 1.15rem; line-height: 1.5; color: #243038; }
      nav a { margin-right: 1rem; color: #0f4c5c; }
      .locales a { margin-right: 0.75rem; }
    </style>
  </head>
  <body>
    <main>
      <p class="locales">${t(locale, 'locale.switch')}:
        <a href="?lang=en">${t(locale, 'locale.en')}</a>
        <a href="?lang=ml">${t(locale, 'locale.ml')}</a>
      </p>
      <h1>${t(locale, 'app.name')}</h1>
      <p>${t(locale, 'app.tagline')}</p>
      <nav>
        <a href="?lang=${locale}">${t(locale, 'nav.home')}</a>
        <a href="?lang=${locale}">${t(locale, 'nav.challenges')}</a>
        <a href="?lang=${locale}">${t(locale, 'nav.progress')}</a>
      </nav>
      <p>${t(locale, 'health.ok')}</p>
    </main>
  </body>
</html>`;

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(port, () => {
  console.log(`@koode/web foundation shell on http://localhost:${port}?lang=en`);
  console.log(`Malayalam: http://localhost:${port}?lang=ml`);
});
