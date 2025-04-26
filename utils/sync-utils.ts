/**
 * Simple cloud sync utilities using Firebase Realtime Database
 */
import { getFromFirebase, saveToFirebase, updateFirebaseData } from "../firebase-config"

// Types for our data
export type SyncableData = {
  inventory?: any[]
  transactions?: any[]
  inwardEntries?: any[]
  lastSyncTime?: string
}

/**
 * Push local data to cloud storage
 * @param data Data to be synced
 * @returns Success status
 */
export const pushToCloud = async (data: SyncableData): Promise<boolean> => {
  try {
    // Add timestamp
    const dataWithTimestamp = {
      ...data,
      lastSyncTime: new Date().toISOString(),
    }

    // Save to Firebase
    const success = await saveToFirebase(dataWithTimestamp)
    return success
  } catch (error) {
    console.error("Error pushing data to cloud:", error)
    return false
  }
}

/**
 * Pull data from cloud storage
 * @returns Retrieved data or null if failed
 */
export const pullFromCloud = async (): Promise<SyncableData | null> => {
  try {
    // Get data from Firebase
    const data = await getFromFirebase()
    return data
  } catch (error) {
    console.error("Error pulling data from cloud:", error)
    return null
  }
}

/**
 * Update specific data in cloud storage
 * @param path Path to the data (e.g., "inventory")
 * @param data Data to update
 * @returns Success status
 */
export const updateCloudData = async (path: string, data: any): Promise<boolean> => {
  try {
    // Update specific data in Firebase
    const success = await updateFirebaseData(path, data)
    return success
  } catch (error) {
    console.error(`Error updating ${path} in cloud:`, error)
    return false
  }
}

/**
 * Generate a backup code for manual sync between devices
 * @param data Data to be backed up
 * @returns Backup code
 */
export const generateBackupCode = (data: SyncableData): string => {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(data)

    // Encode as base64
    const base64String = btoa(jsonString)

    // Generate a random code prefix
    const prefix = Math.random().toString(36).substring(2, 6).toUpperCase()

    // Store in localStorage with the code as key
    localStorage.setItem(`ga-backup-${prefix}`, base64String)

    return prefix
  } catch (error) {
    console.error("Error generating backup code:", error)
    return ""
  }
}

/**
 * Restore data from a backup code
 * @param code Backup code
 * @returns Retrieved data or null if failed
 */
export const restoreFromBackupCode = (code: string): SyncableData | null => {
  try {
    // Get base64 string from localStorage
    const base64String = localStorage.getItem(`ga-backup-${code}`)
    if (!base64String) return null

    // Decode base64 string
    const jsonString = atob(base64String)

    // Parse JSON
    const data = JSON.parse(jsonString)

    return data
  } catch (error) {
    console.error("Error restoring from backup code:", error)
    return null
  }
}
