import { Client } from 'minio';

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'breezy-media';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

/**
 * Create a bucket if it doesn't exist and set a public read policy for it.
 * Cloudflare R2 doesn't support S3 bucket policies via the API — public access
 * there is configured once in the Cloudflare dashboard, so the policy call is
 * best-effort and ignored if the provider rejects it.
 */
export const ensureBucket = async () => {
  const exists = await minioClient.bucketExists(BUCKET_NAME).catch(() => false);
  if (exists) return;

  await minioClient.makeBucket(BUCKET_NAME);

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
      },
    ],
  };

  await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy)).catch((err) => {
    console.warn('[media-service] setBucketPolicy not supported by this storage provider, skipping:', err.message);
  });
};
