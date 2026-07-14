import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { StorageProvider, UploadResult, PresignResult, DeleteResult } from "../types"

export class R2StorageProvider implements StorageProvider {
  private readonly client:    S3Client
  private readonly bucket:    string
  private readonly publicUrl: string

  constructor() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    const bucket    = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

    if (!accountId || !accessKey || !secretKey || !bucket || !publicUrl) {
      throw new Error("[R2] Missing required environment variables")
    }

    this.client = new S3Client({
      region:      "auto",
      endpoint:    `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })
    this.bucket    = bucket
    this.publicUrl = publicUrl.replace(/\/$/, "")
  }

  async upload(params: { buffer: Buffer; filePath: string; contentType: string }): Promise<UploadResult> {
    await this.client.send(new PutObjectCommand({
      Bucket:       this.bucket,
      Key:          params.filePath,
      Body:         params.buffer,
      ContentType:  params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }))
    return { fileUrl: this.getPublicUrl(params.filePath), filePath: params.filePath }
  }

  async presignUpload(params: {
    filePath: string; contentType: string; fileSize: number; expiresIn?: number
  }): Promise<PresignResult> {
    const expiresIn = params.expiresIn ?? 900

    const command = new PutObjectCommand({
      Bucket:        this.bucket,
      Key:           params.filePath,
      ContentType:   params.contentType,
      ContentLength: params.fileSize,
      CacheControl:  "public, max-age=31536000, immutable",
    })

    const uploadUrl = await awsGetSignedUrl(this.client, command, { expiresIn })

    return {
      uploadUrl,
      filePath: params.filePath,
      headers:  {
        "Content-Type":   params.contentType,
        "Content-Length": String(params.fileSize),
        "Cache-Control":  "public, max-age=31536000, immutable",
      },
      expiresAt: Date.now() + expiresIn * 1000,
    }
  }

  async delete(filePath: string): Promise<DeleteResult> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: filePath }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown" }
    }
  }

  getPublicUrl(filePath: string): string {
    return `${this.publicUrl}/${filePath}`
  }

  async getSignedUrl(params: { filePath: string; expiresIn: number }): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: params.filePath })
    return awsGetSignedUrl(this.client, command, { expiresIn: params.expiresIn })
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: filePath }))
      return true
    } catch { return false }
  }
}
