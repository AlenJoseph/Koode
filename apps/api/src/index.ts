import { createServer } from 'node:http';
import { getHealth } from './health.js';

const port = Number(process.env.PORT ?? 3001);

const httpServer = createServer((_req, res) => {
  const body = JSON.stringify(getHealth());
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(body);
});

httpServer.listen(port, () => {
  console.log(`@koode/api listening on http://localhost:${port}`);
});
