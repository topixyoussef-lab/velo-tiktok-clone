import path from 'path';

export const dataDir = process.env.DATA_DIR || process.cwd();
export const uploadsDir = path.join(dataDir, 'uploads');
export const imagesDir = path.join(uploadsDir, 'images');
