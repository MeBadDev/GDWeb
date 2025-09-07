import { mkdir, writeFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import mime from 'mime-types';

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function saveBuffer(dir: string, filename: string, data: Buffer) {
  await ensureDir(dir);
  const filePath = path.join(dir, filename);
  await writeFile(filePath, data);
  return filePath;
}

export function serveFile(filePath: string) {
  const ext = path.extname(filePath);
  const type = mime.lookup(ext) || 'application/octet-stream';
  return { stream: createReadStream(filePath), type };
}

export async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
