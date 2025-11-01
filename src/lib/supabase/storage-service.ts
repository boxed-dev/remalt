/**
 * Supabase Storage Service
 *
 * Unified file upload service for all media types (PDFs, images, audio, video).
 * Replaces Uploadcare CDN with Supabase Storage.
 *
 * File structure: media/{userId}/{type}/{uuid}-{filename}
 * Example: media/abc-123/pdfs/550e8400-document.pdf
 */

import { createClient } from '@/lib/supabase/client'

export type MediaType = 'pdfs' | 'images' | 'audio' | 'instagram' | 'videos'

export interface UploadResult {
  path: string
  publicUrl: string
  fileName: string
  fileSize: number
  mimeType: string
}

export interface UploadOptions {
  onProgress?: (progress: number) => void
  cacheControl?: string
  upsert?: boolean
  metadata?: Record<string, string>
}

/**
 * Upload a file to Supabase Storage (client-side)
 * Uses XMLHttpRequest for real-time progress tracking
 */
export async function uploadFile(
  file: File,
  userId: string,
  type: MediaType,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const supabase = createClient()
  const uuid = crypto.randomUUID()
  const fileName = file.name
  const filePath = `${userId}/${type}/${uuid}-${fileName}`

  // Get session for authentication
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) {
    throw new Error('No active session - please sign in')
  }

  // Use XMLHttpRequest for progress tracking
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        console.log(`[Upload Progress] ${fileName}: ${percentComplete.toFixed(1)}%`)
        if (options.onProgress) {
          options.onProgress(percentComplete)
        }
      }
    })

    // Also log when upload starts
    xhr.upload.addEventListener('loadstart', () => {
      console.log(`[Upload Start] ${fileName}`)
      if (options.onProgress) {
        options.onProgress(0)
      }
    })

    // Handle completion
    xhr.addEventListener('load', () => {
      console.log(`[Upload Complete] ${fileName} - Status: ${xhr.status}`)
      if (xhr.status >= 200 && xhr.status < 300) {
        // Set to 100% before resolving
        if (options.onProgress) {
          options.onProgress(100)
        }

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)

        resolve({
          path: filePath,
          publicUrl: urlData.publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        })
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(`Upload failed: ${error.message || xhr.statusText}`))
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      }
    })

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    // Construct Supabase Storage URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const uploadUrl = `${supabaseUrl}/storage/v1/object/media/${filePath}`

    // Open request
    xhr.open('POST', uploadUrl, true)

    // Set headers
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.setRequestHeader('x-upsert', options.upsert ? 'true' : 'false')
    if (options.cacheControl) {
      xhr.setRequestHeader('cache-control', options.cacheControl)
    }

    // Send file
    xhr.send(file)
  })
}

/**
 * Upload a file from a URL (server-side)
 * Used for Instagram media and other remote files
 * IMPORTANT: This bypasses RLS using service role for server-side operations
 */
export async function uploadFromUrl(
  sourceUrl: string,
  userId: string,
  type: MediaType,
  fileName: string,
  options: UploadOptions & { contentType?: string } = {}
): Promise<UploadResult> {
  try {
    // Import axios for better handling of redirects and Instagram CDN
    const axios = (await import('axios')).default

    // Fetch the file from URL with proper headers for Instagram/social media CDNs
    // Use axios with custom DNS resolution and IPv4/IPv6 fallback
    const response = await axios.get(sourceUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: (status) => status >= 200 && status < 300,
      family: 4, // Force IPv4 (Instagram CDN sometimes has IPv6 issues)
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024,
    })

    const blob = new Blob([response.data], {
      type: options.contentType || response.headers['content-type'] || 'application/octet-stream',
    })
    const file = new File([blob], fileName, {
      type: options.contentType || response.headers['content-type'] || 'application/octet-stream',
    })

    const uuid = crypto.randomUUID()
    const filePath = `${userId}/${type}/${uuid}-${fileName}`

    // Use service role client for server-side uploads (bypasses RLS)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
        contentType: file.type,
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(data.path)

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      fileName,
      fileSize: file.size,
      mimeType: file.type,
    }
  } catch (error) {
    console.error('Upload from URL error:', error)
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        throw new Error(`Failed to resolve hostname - Instagram CDN URL may be expired or invalid`)
      }
      if (error.message.includes('timeout')) {
        throw new Error(`Upload timeout - file may be too large or network is slow`)
      }
    }
    throw error
  }
}

/**
 * Upload with retry logic (for unreliable sources like Instagram)
 * Attempts upload up to maxRetries times with exponential backoff
 */
export async function uploadWithRetry(
  sourceUrl: string,
  userId: string,
  type: MediaType,
  fileName: string,
  options: UploadOptions & { contentType?: string } = {},
  maxRetries: number = 3
): Promise<UploadResult> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadFromUrl(sourceUrl, userId, type, fileName, options)
    } catch (error) {
      lastError = error as Error
      console.error(`Upload attempt ${attempt + 1} failed:`, error)

      // Don't retry on the last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(
    `Upload failed after ${maxRetries} attempts: ${lastError?.message}`
  )
}

/**
 * Upload multiple files from URLs with partial success support
 * Returns array of results with success/error status for each upload
 */
export async function uploadMultipleFromUrls(
  urls: Array<{ url: string; fileName: string; contentType?: string }>,
  userId: string,
  type: MediaType,
  options: UploadOptions = {},
  maxRetries: number = 3
): Promise<
  Array<{
    success: boolean
    result?: UploadResult
    error?: string
    originalUrl: string
  }>
> {
  const results = await Promise.allSettled(
    urls.map(({ url, fileName, contentType }) =>
      uploadWithRetry(url, userId, type, fileName, { ...options, contentType }, maxRetries)
    )
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        result: result.value,
        originalUrl: urls[index].url,
      }
    } else {
      return {
        success: false,
        error: result.reason?.message || 'Upload failed',
        originalUrl: urls[index].url,
      }
    }
  })
}

/**
 * Get public URL for a file path
 */
export function getPublicUrl(path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from('media').remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Delete multiple files from storage
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from('media').remove(paths)

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Extract user ID and file info from storage path
 * Example: "abc-123/pdfs/550e8400-document.pdf" -> { userId: "abc-123", type: "pdfs", fileName: "document.pdf" }
 */
export function parseStoragePath(path: string): {
  userId: string
  type: MediaType
  fileName: string
  uuid: string
} | null {
  const parts = path.split('/')
  if (parts.length !== 3) return null

  const [userId, type, fileNameWithUuid] = parts
  const uuidMatch = fileNameWithUuid.match(/^([a-f0-9-]+)-(.+)$/)

  if (!uuidMatch) return null

  return {
    userId,
    type: type as MediaType,
    uuid: uuidMatch[1],
    fileName: uuidMatch[2],
  }
}

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('.supabase.co/storage/v1/object/public/media/')
}

/**
 * Extract path from Supabase Storage URL
 * Example: "https://project.supabase.co/storage/v1/object/public/media/abc/pdfs/file.pdf" -> "abc/pdfs/file.pdf"
 */
export function extractPathFromUrl(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/)
  return match ? match[1] : null
}
