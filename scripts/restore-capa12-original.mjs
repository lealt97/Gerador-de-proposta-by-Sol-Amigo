import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_SHA256 = '7566e06773d5a85b85c8d9faa4a0d0653b215cd9de4f2b8a338f77c758e013a0';
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = resolve(repositoryRoot, '.github/capa12-restore');
const outputPath = resolve(repositoryRoot, 'public/pdf-assets/covers/A4 -12.svg');

const partNames = readdirSync(partsDirectory)
  .filter((name) => /^part-\d+$/.test(name))
  .sort((left, right) => left.localeCompare(right, 'en'));

if (!partNames.length) {
  throw new Error(`Partes compactadas da capa 12 não encontradas em ${partsDirectory}.`);
}

const encoded = partNames
  .map((name) => readFileSync(resolve(partsDirectory, name), 'utf8').trim())
  .join('');
const compressed = Buffer.from(encoded, 'base64');

function tryCommand(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });

  if (!result.error && result.status === 0 && result.stdout?.length) {
    return result.stdout;
  }

  return null;
}

let svg = tryCommand('xz', ['--decompress', '--stdout'], compressed);

if (!svg) {
  const pythonProgram = [
    'import lzma, sys',
    'sys.stdout.buffer.write(lzma.decompress(sys.stdin.buffer.read()))',
  ].join('; ');

  svg = tryCommand('python3', ['-c', pythonProgram], compressed)
    || tryCommand('python', ['-c', pythonProgram], compressed);
}

if (!svg) {
  throw new Error('Não foi possível descompactar a capa 12. Instale xz ou Python com o módulo lzma.');
}

const actualSha256 = createHash('sha256').update(svg).digest('hex');
if (actualSha256 !== EXPECTED_SHA256) {
  throw new Error(`Falha de integridade da capa 12: esperado ${EXPECTED_SHA256}, obtido ${actualSha256}.`);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, svg);
console.log(`Capa A4 12 original restaurada e validada: ${actualSha256}`);
