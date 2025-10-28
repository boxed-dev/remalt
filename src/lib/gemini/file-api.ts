/**
 * Gemini File API Utilities
 *
 * Provides utilities for uploading files to Gemini File API
 * for better performance with large documents.
 */

import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';

export interface FileUploadResult {
  fileUri: string;
  mimeType: string;
  state: FileState;
  displayName?: string;
  sizeBytes?: string;
}

export interface FileUploadOptions {
  displayName?: string;
  mimeType?: string;
}

/**
 * Upload a file to Gemini File API
 */
export async function uploadFileToGemini(
  fileBuffer: ArrayBuffer,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  // Convert ArrayBuffer to Buffer for Node.js
  const buffer = Buffer.from(fileBuffer);

  // Upload file
  const uploadResult = await fileManager.uploadFile(buffer, {
    mimeType: options.mimeType || 'application/pdf',
    displayName: options.displayName || 'document.pdf',
  });

  console.log('[Gemini File API] File uploaded:', {
    uri: uploadResult.file.uri,
    state: uploadResult.file.state,
    displayName: uploadResult.file.displayName,
  });

  return {
    fileUri: uploadResult.file.uri,
    mimeType: uploadResult.file.mimeType,
    state: uploadResult.file.state,
    displayName: uploadResult.file.displayName,
    sizeBytes: uploadResult.file.sizeBytes,
  };
}

/**
 * Wait for file to be processed by Gemini
 */
export async function waitForFileProcessing(
  fileUri: string,
  maxWaitTimeMs: number = 60000
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const fileManager = new GoogleAIFileManager(apiKey);
  const startTime = Date.now();

  // Extract file name from URI (format: files/filename)
  const fileName = fileUri.split('/').pop();
  if (!fileName) {
    throw new Error('Invalid file URI format');
  }

  while (Date.now() - startTime < maxWaitTimeMs) {
    const file = await fileManager.getFile(fileName);

    if (file.state === FileState.ACTIVE) {
      console.log('[Gemini File API] File is ready');
      return;
    }

    if (file.state === FileState.FAILED) {
      throw new Error('File processing failed');
    }

    // Wait 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('File processing timeout');
}

/**
 * Delete a file from Gemini File API
 */
export async function deleteGeminiFile(fileUri: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const fileManager = new GoogleAIFileManager(apiKey);
  const fileName = fileUri.split('/').pop();

  if (!fileName) {
    throw new Error('Invalid file URI format');
  }

  await fileManager.deleteFile(fileName);
  console.log('[Gemini File API] File deleted:', fileName);
}

/**
 * Upload file from URL to Gemini File API
 */
export async function uploadFileFromUrl(
  url: string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  // Fetch file from URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
  }

  const fileBuffer = await response.arrayBuffer();

  return uploadFileToGemini(fileBuffer, options);
}
