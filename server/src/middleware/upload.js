import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { UPLOADS_DIR } from '../config/paths.js';
import { HttpError } from '../utils/HttpError.js';
import { removeFromCloud } from '../utils/storage.js';

// Extensions come from this fixed map, never from the client's filename, so an
// uploaded file can never be served as HTML/SVG/JS.
const VIDEO_EXT = { 'video/webm': '.webm', 'video/mp4': '.mp4', 'video/quicktime': '.mov' };
const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
export const SERVED_TYPES = {
  '.pdf': 'application/pdf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const baseType = (file) => (file.mimetype || '').split(';')[0].toLowerCase();
const isPdf = (file) =>
  baseType(file) === 'application/pdf' ||
  // Some Android pickers send no type; the magic-byte check below still applies.
  (['', 'application/octet-stream'].includes(baseType(file)) && /\.pdf$/i.test(file.originalname));

function storageFor(folder, extFor) {
  const dir = path.join(UPLOADS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${extFor(file)}`),
  });
}

export const resumeUpload = multer({
  storage: storageFor('resumes', () => '.pdf'),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (isPdf(file) ? cb(null, true) : cb(new HttpError(400, 'Resume must be a PDF file'))),
}).single('resume');

export const videoUpload = multer({
  storage: storageFor('videos', (file) => VIDEO_EXT[baseType(file)]),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    VIDEO_EXT[baseType(file)] ? cb(null, true) : cb(new HttpError(400, 'Video must be MP4, WebM or MOV')),
}).single('video');

// Profile photos and company logos (field name "image").
export const imageUpload = multer({
  storage: storageFor('images', (file) => IMAGE_EXT[baseType(file)]),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    IMAGE_EXT[baseType(file)] ? cb(null, true) : cb(new HttpError(400, 'Photo must be a JPG, PNG or WebP image')),
}).single('image');

const SIGNATURES = {
  pdf: (h) => h.subarray(0, 5).toString('latin1') === '%PDF-',
  video: (h) => h.readUInt32BE(0) === 0x1a45dfa3 || h.subarray(4, 8).toString('latin1') === 'ftyp', // WebM/MKV or MP4/MOV
  image: (h) =>
    (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) || // JPEG
    h.readUInt32BE(0) === 0x89504e47 || // PNG
    (h.subarray(0, 4).toString('latin1') === 'RIFF' && h.subarray(8, 12).toString('latin1') === 'WEBP'),
};
const SIGNATURE_ERRORS = { pdf: 'This file is not a valid PDF', video: 'This file is not a valid video', image: 'This file is not a valid image' };

// Checks the file's real contents, since the declared type is easy to fake.
export async function assertFileSignature(file, kind) {
  const handle = await fs.promises.open(file.path, 'r');
  const head = Buffer.alloc(12);
  await handle.read(head, 0, 12, 0);
  await handle.close();
  if (!SIGNATURES[kind](head)) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw new HttpError(400, SIGNATURE_ERRORS[kind]);
  }
}

export const publicPath = (file) => `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;

export function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  removeFromCloud(url);
  const target = path.join(UPLOADS_DIR, url.split('?')[0].slice('/uploads/'.length));
  fs.promises.unlink(target).catch(() => {});
}
