import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { minioClient, BUCKET_NAME } from '../config/minio';
import { AppError } from '../utils/AppError';

/**
 * Upload a media file (image or video) to MinIO
 */
export const uploadMedia = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No file provided.');
  }

  const ext = req.file.originalname.split('.').pop();
  const objectName = `${randomUUID()}.${ext}`;
  const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    await minioClient.putObject(BUCKET_NAME, objectName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype,
    });

    // MINIO_PUBLIC_URL must already point at the bucket root (e.g. MinIO's
    // path-style http://host:9000/<bucket>, or R2's per-bucket dev domain
    // which doesn't take the bucket name in the path).
    const publicUrl = `${process.env.MINIO_PUBLIC_URL || `http://localhost:9000/${BUCKET_NAME}`}/${objectName}`;

    return res.status(201).json({ type: mediaType, url: publicUrl, object_name: objectName });
};

/**
 * Delete a media file from MinIO
 */
export const deleteMedia = async (req: Request, res: Response) => {
  const objectName = Array.isArray(req.params.objectName) ? req.params.objectName[0] : req.params.objectName;

    await minioClient.removeObject(BUCKET_NAME, objectName);
    return res.status(200).json({ message: 'Media deleted successfully.' });
};
