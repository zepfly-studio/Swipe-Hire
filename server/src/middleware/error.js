import multer from 'multer';
import mongoose from 'mongoose';
import { HttpError } from '../utils/HttpError.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
    return res.status(400).json({ message });
  }
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Some details are invalid, please check and try again' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'This already exists' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid request body' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong, please try again' });
}
