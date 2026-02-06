import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Result type for file picking operations
 */
export interface FilePickResult {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

/**
 * Pick an image from the device's photo library or camera
 */
export const pickImage = async (
  options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    allowsMultipleSelection?: boolean;
  }
): Promise<FilePickResult | FilePickResult[] | null> => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options?.allowsEditing ?? false,
      aspect: options?.aspect,
      quality: options?.quality ?? 0.8,
      allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
    });

    if (result.canceled) {
      return null;
    }

    // Handle multiple selection
    if (result.assets && result.assets.length > 1) {
      return result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      }));
    }

    // Handle single selection
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName || `image_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    };
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

/**
 * Take a photo using the device's camera
 */
export const takePhoto = async (
  options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }
): Promise<FilePickResult | null> => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: options?.allowsEditing ?? false,
      aspect: options?.aspect,
      quality: options?.quality ?? 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName || `photo_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

/**
 * Pick a document from the device
 */
export const pickDocument = async (
  options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }
): Promise<FilePickResult | FilePickResult[] | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: options?.type || '*/*',
      copyToCacheDirectory: options?.copyToCacheDirectory ?? true,
      multiple: options?.multiple ?? false,
    });

    if (result.canceled) {
      return null;
    }

    // Handle multiple selection
    if (result.assets && result.assets.length > 1) {
      return result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || undefined,
      }));
    }

    // Handle single selection
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
      size: asset.size || undefined,
    };
  } catch (error) {
    console.error('Error picking document:', error);
    throw error;
  }
};

/**
 * Pick an audio file from the device
 */
export const pickAudio = async (
  options?: {
    multiple?: boolean;
  }
): Promise<FilePickResult | FilePickResult[] | null> => {
  return pickDocument({
    type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a'],
    multiple: options?.multiple ?? false,
  });
};

/**
 * Convert a file URI to a Blob (native only)
 */
export const uriToBlob = async (uri: string): Promise<Blob> => {
  // Read the file as base64 and create blob
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  // Detect mime type from URI
  const mimeType = getMimeTypeFromUri(uri);

  // Convert base64 to blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Get MIME type from file URI
 */
const getMimeTypeFromUri = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/m4a',
  };
  return mimeTypes[extension || ''] || 'application/octet-stream';
};

/**
 * Create FormData for file upload (native only)
 */
export const createFormData = async (
  file: FilePickResult,
  fieldName: string = 'file',
  additionalData?: Record<string, string | number | boolean>
): Promise<FormData> => {
  const formData = new FormData();

  // On native platforms, FormData accepts uri directly
  formData.append(fieldName, {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  // Add additional data
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }

  return formData;
};

/**
 * Create FormData for multiple files upload (native only)
 */
export const createMultiFileFormData = async (
  files: FilePickResult[],
  fieldName: string = 'files',
  additionalData?: Record<string, string | number | boolean>
): Promise<FormData> => {
  const formData = new FormData();

  // Add all files
  for (const file of files) {
    formData.append(fieldName, {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
  }

  // Add additional data
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }

  return formData;
};

/**
 * Get file info from URI
 */
export const getFileInfo = async (uri: string): Promise<FileSystem.FileInfo> => {
  return await FileSystem.getInfoAsync(uri);
};

/**
 * Delete a file from the filesystem
 */
export const deleteFile = async (uri: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};
