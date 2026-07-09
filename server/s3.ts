import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_EXT = new Set(['mp3', 'm4a', 'wav', 'webm', 'ogg', 'mp4', 'aac'])
export const MAX_RECORDING_BYTES = 50 * 1024 * 1024

function bucket(): string {
  return process.env.AWS_S3_BUCKET ?? 'convobrainssalescall'
}

function region(): string {
  return process.env.AWS_REGION ?? 'ap-south-1'
}

let client: S3Client | null = null

function s3(): S3Client {
  if (!client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY')
    }
    client = new S3Client({
      region: region(),
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export function normalizeExt(raw: string): string | null {
  const ext = raw.toLowerCase().replace(/^\./, '')
  return ALLOWED_EXT.has(ext) ? ext : null
}

export function stagingKey(conversationId: string, ext: string): string {
  return `${conversationId}_staging.${ext}`
}

export function formatS3Timestamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}-${p(d.getUTCMilliseconds(), 3)}`
}

export function finalKey(conversationId: string, ext: string, calledAt: Date): string {
  return `${conversationId}_${formatS3Timestamp(calledAt)}.${ext}`
}

export function objectUrl(key: string): string {
  return `https://${bucket()}.s3.${region()}.amazonaws.com/${key}`
}

export function keyFromUrl(url: string): string {
  const prefix = `https://${bucket()}.s3.${region()}.amazonaws.com/`
  if (!url.startsWith(prefix)) throw new Error('Invalid s3_url for bucket')
  return url.slice(prefix.length)
}

export async function presignPut(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(s3(), cmd, { expiresIn: 900 })
}

export async function presignGet(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key })
  return getSignedUrl(s3(), cmd, { expiresIn: 3600 })
}

export async function headObject(key: string) {
  return s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
}

export async function copyToFinal(staging: string, final: string) {
  await s3().send(
    new CopyObjectCommand({
      Bucket: bucket(),
      CopySource: `${bucket()}/${staging}`,
      Key: final,
    }),
  )
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
}

export function contentTypeForExt(ext: string): string {
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'm4a':
    case 'mp4':
      return 'audio/mp4'
    case 'wav':
      return 'audio/wav'
    case 'webm':
      return 'audio/webm'
    case 'ogg':
      return 'audio/ogg'
    case 'aac':
      return 'audio/aac'
    default:
      return 'application/octet-stream'
  }
}
