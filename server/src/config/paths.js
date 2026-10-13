import { fileURLToPath } from 'node:url';

export const UPLOADS_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));
export const DATA_DIR = fileURLToPath(new URL('../../.data', import.meta.url));
