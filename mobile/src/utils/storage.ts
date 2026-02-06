import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utility wrapper around AsyncStorage
 * Provides a localStorage-like API for React Native
 */

/**
 * Get an item from storage
 */
export const getItem = async (key: string): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value;
  } catch (error) {
    console.error(`Error getting item ${key} from storage:`, error);
    return null;
  }
};

/**
 * Set an item in storage
 */
export const setItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting item ${key} in storage:`, error);
    return false;
  }
};

/**
 * Remove an item from storage
 */
export const removeItem = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item ${key} from storage:`, error);
    return false;
  }
};

/**
 * Clear all items from storage
 */
export const clear = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
};

/**
 * Get all keys from storage
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys;
  } catch (error) {
    console.error('Error getting all keys from storage:', error);
    return [];
  }
};

/**
 * Get multiple items from storage
 */
export const multiGet = async (keys: string[]): Promise<Record<string, string | null>> => {
  try {
    const values = await AsyncStorage.multiGet(keys);
    const result: Record<string, string | null> = {};
    values.forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  } catch (error) {
    console.error('Error getting multiple items from storage:', error);
    return {};
  }
};

/**
 * Set multiple items in storage
 */
export const multiSet = async (keyValuePairs: [string, string][]): Promise<boolean> => {
  try {
    await AsyncStorage.multiSet(keyValuePairs);
    return true;
  } catch (error) {
    console.error('Error setting multiple items in storage:', error);
    return false;
  }
};

/**
 * Remove multiple items from storage
 */
export const multiRemove = async (keys: string[]): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error removing multiple items from storage:', error);
    return false;
  }
};

/**
 * Get an object from storage (automatically parses JSON)
 */
export const getObject = async <T = any>(key: string): Promise<T | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error getting object ${key} from storage:`, error);
    return null;
  }
};

/**
 * Set an object in storage (automatically stringifies JSON)
 */
export const setObject = async (key: string, value: any): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error setting object ${key} in storage:`, error);
    return false;
  }
};

/**
 * Check if a key exists in storage
 */
export const hasKey = async (key: string): Promise<boolean> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.includes(key);
  } catch (error) {
    console.error(`Error checking if key ${key} exists in storage:`, error);
    return false;
  }
};

/**
 * Default export with all methods
 */
export const storage = {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
  getObject,
  setObject,
  hasKey,
};

export default storage;
