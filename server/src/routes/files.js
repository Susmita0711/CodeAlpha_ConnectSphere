import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticate } from '../middleware/auth.js';
import { safeFileName, isValidRoomId } from '../utils/validation.js';

const router = Router();
const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const files = new Map();
const allowedTypes = new Set([
  'application/pdf', 'text/plain', 'text/csv', 'application/json',
  'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'video/mp4'
]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}`)
});
const uploader = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.has(file.mimetype) || ['.exe', '.bat', '.cmd', '.js', '.html', '.sh'].includes(ext)) {
      return cb(new Error('This file type is not allowed.'));
    }
    return cb(null, true);
  }
});

export function addFileRoutes(app, isRoomMember, notifyRoom) {
  app.use('/api/files', router);
  router.post('/:roomId', authenticate, (req, res, next) => {
    if (!isValidRoomId(req.params.roomId)) return res.status(400).json({ message: 'Invalid meeting ID.' });
    if (!isRoomMember(req.params.roomId, req.user.sub)) return res.status(403).json({ message: 'Join this meeting before sharing a file.' });
    return uploader.single('file')(req, res, (error) => {
      if (error) return res.status(400).json({ message: error.message || 'File upload failed.' });
      if (!req.file) return res.status(400).json({ message: 'Choose a file to share.' });
      const metadata = {
        id: req.file.filename,
        roomId: req.params.roomId,
        name: safeFileName(req.file.originalname),
        size: req.file.size,
        type: req.file.mimetype,
        uploadedBy: req.user.sub,
        uploadedAt: new Date().toISOString()
      };
      files.set(metadata.id, { ...metadata, path: req.file.path });
      notifyRoom?.(req.params.roomId, metadata);
      return res.status(201).json({ file: metadata });
    });
  });

  router.get('/:roomId/:fileId', authenticate, (req, res, next) => {
    const file = files.get(req.params.fileId);
    if (!file || file.roomId !== req.params.roomId) return res.status(404).json({ message: 'File not found.' });
    if (!isRoomMember(file.roomId, req.user.sub)) return res.status(403).json({ message: 'Join this meeting to download its files.' });
    if (!fs.existsSync(file.path)) return res.status(404).json({ message: 'File is no longer available.' });
    return res.download(file.path, file.name, (error) => {
      if (error && !res.headersSent) next(error);
    });
  });

  router.get('/:roomId', authenticate, (req, res) => {
    if (!isValidRoomId(req.params.roomId)) return res.status(400).json({ message: 'Invalid meeting ID.' });
    if (!isRoomMember(req.params.roomId, req.user.sub)) return res.status(403).json({ message: 'Join this meeting to view its files.' });
    const roomFiles = [...files.values()]
      .filter((file) => file.roomId === req.params.roomId)
      .map(({ path: _path, ...file }) => file);
    return res.json({ files: roomFiles });
  });
}
