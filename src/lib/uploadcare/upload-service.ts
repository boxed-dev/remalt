/**
 * UploadCare Upload Service
 *
 * Server-side service for uploading media files to UploadCare for permanent storage.
 * Supports uploading from URLs and checking upload status.
 */

const UPLOADCARE_API_BASE = 'https://upload.uploadcare.com';
const UPLOADCARE_CDN_BASE = 'https://ucarecdn.com';

export interface UploadFromUrlParams {
  sourceUrl: string;
  filename?: string;
  store?: '0' | '1' | 'auto'; // 0=temporary, 1=permanent, auto=default
  checkDuplicates?: boolean;
  saveDuplicates?: boolean;
  metadata?: Record<string, string>;
}

export interface UploadToken {
  type: 'token';
  token: string;
}

export interface UploadStatus {
  status: 'waiting' | 'progress' | 'success' | 'error';
  done?: number;
  total?: number;
  uuid?: string;
  file_id?: string;
  is_ready?: boolean;
  is_image?: boolean;
  filename?: string;
  size?: number;
  mime_type?: string;
  error?: string;
  original_file_url?: string; // Full CDN URL with project-specific subdomain
}

export interface UploadResult {
  uuid: string;
  filename: string;
  cdnUrl: string;
  size?: number;
  mimeType?: string;
  isImage?: boolean;
}

/**
 * Upload a file from a URL to UploadCare
 */
export async function uploadFromUrl(
  params: UploadFromUrlParams
): Promise<UploadToken> {
  const publicKey = process.env.UPLOADCARE_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error('UploadCare public key not configured');
  }

  const formData = new FormData();
  formData.append('pub_key', publicKey);
  formData.append('source_url', params.sourceUrl);

  if (params.filename) {
    formData.append('filename', params.filename);
  }

  if (params.store) {
    formData.append('store', params.store);
  }

  if (params.checkDuplicates) {
    formData.append('check_URL_duplicates', '1');
  }

  if (params.saveDuplicates) {
    formData.append('save_URL_duplicates', '1');
  }

  // Add metadata
  if (params.metadata) {
    Object.entries(params.metadata).forEach(([key, value]) => {
      formData.append(`metadata[${key}]`, value);
    });
  }

  const response = await fetch(`${UPLOADCARE_API_BASE}/from_url/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UploadCare upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as UploadToken;
  return result;
}

/**
 * Check the status of an upload using the token
 */
export async function checkUploadStatus(token: string): Promise<UploadStatus> {
  const response = await fetch(
    `${UPLOADCARE_API_BASE}/from_url/status/?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check upload status: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as UploadStatus;
  return result;
}

/**
 * Poll upload status until completion (with timeout)
 */
export async function waitForUploadCompletion(
  token: string,
  options: {
    pollInterval?: number; // milliseconds
    timeout?: number; // milliseconds
  } = {}
): Promise<UploadResult> {
  const pollInterval = options.pollInterval || 1000; // 1 second
  const timeout = options.timeout || 60000; // 60 seconds
  const startTime = Date.now();

  while (true) {
    const status = await checkUploadStatus(token);

    if (status.status === 'success') {
      if (!status.uuid) {
        throw new Error('Upload succeeded but no UUID returned');
      }

      let cdnUrl = status.original_file_url || getCdnUrl(status.uuid, status.filename);

      // Explicitly store the file permanently and get the correct CDN URL
      try {
        const storeResult = await storeFile(status.uuid);
        console.log(`[UploadCare] File ${status.uuid} stored permanently`);
        
        // Use the CDN URL from the file info API if available
        if (storeResult.cdnUrl) {
          cdnUrl = storeResult.cdnUrl;
          console.log(`[UploadCare] Using CDN URL from file info: ${cdnUrl}`);
        }
      } catch (error) {
        console.error(`[UploadCare] Failed to store file ${status.uuid}:`, error);
        // Continue with the fallback URL
      }
      
      console.log(`[UploadCare] Final CDN URL for ${status.uuid}: ${cdnUrl}`);

      return {
        uuid: status.uuid,
        filename: status.filename || 'file',
        cdnUrl,
        size: status.size,
        mimeType: status.mime_type,
        isImage: status.is_image,
      };
    }

    if (status.status === 'error') {
      throw new Error(`Upload failed: ${status.error || 'Unknown error'}`);
    }

    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Upload timed out');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * Upload from URL and wait for completion (convenience method)
 */
export async function uploadAndWait(
  params: UploadFromUrlParams,
  waitOptions?: {
    pollInterval?: number;
    timeout?: number;
  }
): Promise<UploadResult> {
  const { token } = await uploadFromUrl(params);
  return waitForUploadCompletion(token, waitOptions);
}

/**
 * Explicitly store a file permanently (required after from_url upload)
 * Uses REST API which requires both public and secret keys
 * Returns the file info including the correct CDN URL
 */
export async function storeFile(uuid: string): Promise<{ cdnUrl?: string }> {
  const publicKey = process.env.UPLOADCARE_PUBLIC_KEY;
  const secretKey = process.env.UPLOADCARE_SECRET_KEY;
  
  if (!publicKey || !secretKey) {
    throw new Error('UploadCare public and secret keys required for file storage');
  }

  const REST_API_BASE = 'https://api.uploadcare.com';
  
  // First, store the file
  const storeResponse = await fetch(`${REST_API_BASE}/files/${uuid}/storage/`, {
    method: 'PUT',
    headers: {
      'Authorization': `Uploadcare.Simple ${publicKey}:${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    throw new Error(`Failed to store file: ${storeResponse.status} - ${errorText}`);
  }
  
  console.log(`[UploadCare] File ${uuid} stored permanently via REST API`);
  
  // Now get the file info to retrieve the correct CDN URL
  const infoResponse = await fetch(`${REST_API_BASE}/files/${uuid}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Uploadcare.Simple ${publicKey}:${secretKey}`,
      'Accept': 'application/json',
    },
  });
  
  if (infoResponse.ok) {
    const fileInfo = await infoResponse.json() as any;
    console.log(`[UploadCare] File info for ${uuid}:`, fileInfo);
    // The API should return original_file_url with the correct CDN subdomain
    return { cdnUrl: fileInfo.original_file_url };
  }
  
  return {};
}

/**
 * Construct UploadCare CDN URL from UUID
 */
export function getCdnUrl(uuid: string, filename?: string): string {
  if (filename) {
    return `${UPLOADCARE_CDN_BASE}/${uuid}/${filename}`;
  }
  return `${UPLOADCARE_CDN_BASE}/${uuid}/`;
}

/**
 * Upload multiple URLs in parallel
 */
export async function uploadMultipleFromUrls(
  urls: string[],
  options: Omit<UploadFromUrlParams, 'sourceUrl'> = {}
): Promise<UploadResult[]> {
  const uploadPromises = urls.map(url =>
    uploadAndWait({
      ...options,
      sourceUrl: url,
    })
  );

  return Promise.all(uploadPromises);
}

/**
 * Upload with retry logic
 */
export async function uploadWithRetry(
  params: UploadFromUrlParams,
  maxRetries = 3
): Promise<UploadResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadAndWait(params);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Upload failed after retries');
}

export interface UploadResultWithError {
  success: boolean;
  result?: UploadResult;
  error?: string;
  url: string;
}

/**
 * Upload multiple URLs with partial failure support
 * Returns results for successful uploads and errors for failed ones
 */
export async function uploadMultipleWithPartialSuccess(
  urls: string[],
  options: Omit<UploadFromUrlParams, 'sourceUrl'> = {},
  maxRetries = 2
): Promise<UploadResultWithError[]> {
  const uploadPromises = urls.map(async (url): Promise<UploadResultWithError> => {
    try {
      const result = await uploadWithRetry({
        ...options,
        sourceUrl: url,
      }, maxRetries);
      return {
        success: true,
        result,
        url,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
        url,
      };
    }
  });

  return Promise.all(uploadPromises);
}
