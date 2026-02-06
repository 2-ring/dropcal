import * as Clipboard from 'expo-clipboard';

/**
 * Clipboard utility wrapper around expo-clipboard
 * Provides a navigator.clipboard-like API for React Native
 */

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

/**
 * Read text from clipboard
 */
export const readFromClipboard = async (): Promise<string> => {
  try {
    const text = await Clipboard.getStringAsync();
    return text;
  } catch (error) {
    console.error('Error reading from clipboard:', error);
    return '';
  }
};

/**
 * Check if clipboard has content
 */
export const hasContent = async (): Promise<boolean> => {
  try {
    const text = await Clipboard.getStringAsync();
    return text.length > 0;
  } catch (error) {
    console.error('Error checking clipboard content:', error);
    return false;
  }
};

/**
 * Copy URL to clipboard
 */
export const copyUrlToClipboard = async (url: string): Promise<boolean> => {
  try {
    await Clipboard.setUrlAsync(url);
    return true;
  } catch (error) {
    console.error('Error copying URL to clipboard:', error);
    // Fallback to string if URL method fails
    return copyToClipboard(url);
  }
};

/**
 * Default export with all methods (navigator.clipboard-like interface)
 */
export const clipboard = {
  writeText: copyToClipboard,
  readText: readFromClipboard,
  copy: copyToClipboard,
  paste: readFromClipboard,
  hasContent,
  copyUrl: copyUrlToClipboard,
};

export default clipboard;
