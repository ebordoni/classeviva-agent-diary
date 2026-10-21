// ZIP senza dipendenze aggiuntive, generato in build per l'installazione manuale.
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, 'auth-extension');
const destination = path.join(root, 'packages/ui/public/classeviva-auth-extension.zip');
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const chunks = [];
const directory = [];
let offset = 0;
const files = (await readdir(source)).sort();
for (const name of files) {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw Error('Nome file non valido');
  const bytes = await readFile(path.join(source, name));
  const filename = Buffer.from(name);
  const crc = crc32(bytes);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
  local.writeUInt16LE(33, 12);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(bytes.length, 18); local.writeUInt32LE(bytes.length, 22);
  local.writeUInt16LE(filename.length, 26);
  chunks.push(local, filename, bytes);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
  central.writeUInt16LE(33, 14); central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(bytes.length, 24);
  central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
  directory.push(central, filename);
  offset += local.length + filename.length + bytes.length;
}
const central = Buffer.concat(directory);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, Buffer.concat([...chunks, central, end]));
console.log('Estensione di autenticazione pronta per il download dalla UI.');
