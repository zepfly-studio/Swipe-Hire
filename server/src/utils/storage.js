import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import { publicPath } from '../middleware/upload.js';
import { uploadHeaders } from './signedUrl.js';

// Where uploaded files live. With CLOUDINARY_URL set (cloudinary://KEY:SECRET@CLOUD_NAME,
// read by the SDK itself) they go to Cloudinary as private ("authenticated") files, so they
// survive restarts on hosts with temporary disks (e.g. Render). Without it they stay on disk.
// Either way the app links to them the same way: /uploads/<folder>/<file> with a signed,
// expiring query string, and this server fetches the file, so they stay private.
export const cloudEnabled = Boolean(process.env.CLOUDINARY_URL);
const FOLDER = process.env.CLOUDINARY_FOLDER || 'swipehire';
const VIDEO_EXTS = ['webm', 'mp4', 'mov'];

// '/uploads/videos/abc.webm' -> where that file is on Cloudinary.
function cloudRef(url) {
  const rel = url.split('?')[0].slice('/uploads/'.length);
  const ext = path.extname(rel).slice(1).toLowerCase();
  const resourceType = ext === 'pdf' ? 'raw' : VIDEO_EXTS.includes(ext) ? 'video' : 'image';
  const id = `${FOLDER}/${rel}`;
  // "raw" files keep their extension in the id; images and videos don't.
  return resourceType === 'raw' ? { resourceType, publicId: id } : { resourceType, publicId: id.slice(0, -(ext.length + 1)), format: ext };
}

// Saves a file multer just wrote to disk and returns the link stored in the database.
export async function storeUpload(file) {
  const url = publicPath(file);
  if (!cloudEnabled) return url;
  const ref = cloudRef(url);
  try {
    await cloudinary.uploader.upload(file.path, { resource_type: ref.resourceType, type: 'authenticated', public_id: ref.publicId, overwrite: true });
  } finally {
    fs.promises.unlink(file.path).catch(() => {});
  }
  return url;
}

// Deletes a stored file from Cloudinary (local files are removed by removeUpload).
export function removeFromCloud(url) {
  if (!cloudEnabled || !url?.startsWith('/uploads/')) return;
  const ref = cloudRef(url);
  cloudinary.uploader
    .destroy(ref.publicId, { resource_type: ref.resourceType, type: 'authenticated', invalidate: true })
    .catch((err) => console.error('[storage] delete failed:', err.message));
}

// Runs after the signature check and the local-disk lookup: streams the file from
// Cloudinary, passing Range through so videos can seek.
export async function serveFromCloud(req, res, next) {
  if (!cloudEnabled) return next();
  const ref = cloudRef(`/uploads${req.path}`);
  const src = cloudinary.url(ref.publicId, {
    resource_type: ref.resourceType,
    type: 'authenticated',
    sign_url: true,
    secure: true,
    ...(ref.format && { format: ref.format }),
  });
  const upstream = await fetch(src, { headers: req.headers.range ? { Range: req.headers.range } : {}, signal: AbortSignal.timeout(60_000) });
  if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 502).json({ message: 'File not found' });
  uploadHeaders(res, req.path);
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  res.setHeader('Cache-Control', 'private, max-age=10800');
  res.status(upstream.status);
  if (req.method === 'HEAD' || !upstream.body) return res.end();
  Readable.fromWeb(upstream.body).pipe(res);
}
