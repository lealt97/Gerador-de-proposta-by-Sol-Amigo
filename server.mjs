import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
const port = Number.parseInt(process.env.PORT || '4173', 10);
const host = '0.0.0.0';

if (!fs.existsSync(indexPath)) {
  console.error('Build de produção não encontrado. Execute `npm run build` antes de iniciar o servidor.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'solamigo-propostas-fv',
    timestamp: new Date().toISOString(),
  });
});

app.use(
  express.static(distPath, {
    index: false,
    setHeaders(response, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        response.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  }),
);

app.get('*', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.sendFile(indexPath);
});

const server = app.listen(port, host, () => {
  console.log(`SolAmigo disponível em http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} recebido. Encerrando o servidor...`);
  server.close((error) => {
    if (error) {
      console.error('Erro ao encerrar o servidor:', error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
