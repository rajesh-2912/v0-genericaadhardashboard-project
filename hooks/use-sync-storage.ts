"use client"

import { useState, useEffect, useCallback } from "react"
import { getFromFirebase, subscribeToFirebase, updateFirebaseData } from "../firebase-config"
import { useToast } from "@/components/ui/use-toast"

// Type for sync status
export type SyncStatus = "synced" | "syncing" | "local" | "error" | "offline"

// Type for storage options
interface StorageOptions {
  syncWithFirebase?: boolean
  syncInterval?: number // in milliseconds
}

// Default options
const defaultOptions: StorageOptions = {
  syncWithFirebase: true,
  syncInterval: 30000, // 30 seconds
}

export function useSyncStorage<T>(
  key: string,
  initialValue: T,
  options: StorageOptions = {},
): [
  T,
  (value: T) => void,
  SyncStatus,
  {
    sync: () => Promise<boolean>
    lastSyncTime: string | null
    isOnline: boolean
  },
] {
  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options }

  // State for the stored value
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // State for sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local")

  // State for last sync time
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // State for online status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true)

  // Toast for notifications
  const { toast } = useToast()

  // Function to get value from localStorage
  const readFromLocalStorage = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue])

  // Initialize state from localStorage
  useEffect(() => {
    setStoredValue(readFromLocalStorage())

    // Get last sync time from localStorage
    const savedSyncTime = localStorage.getItem(`${key}-last-sync-time`)
    if (savedSyncTime) {
      setLastSyncTime(savedSyncTime)
      setSyncStatus("synced")
    }
  }, [readFromLocalStorage, key])

  // Function to save value to localStorage
  const saveToLocalStorage = useCallback(
    (value: T) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(value))
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key],
  )

  // Function to sync with Firebase
  const syncWithFirebase = useCallback(async (): Promise<boolean> => {
    if (!mergedOptions.syncWithFirebase || !isOnline) {
      return false
    }

    setSyncStatus("syncing")

    try {
      // Save data to Firebase
      const success = await updateFirebaseData(key, storedValue)

      if (success) {
        const currentTime = new Date().toISOString()
        localStorage.setItem(`${key}-last-sync-time`, currentTime)
        setLastSyncTime(currentTime)
        setSyncStatus("synced")
        return true
      } else {
        setSyncStatus("error")
        return false
      }
    } catch (error) {
      console.error(`Error syncing ${key} with Firebase:`, error)
      setSyncStatus("error")
      return false
    }
  }, [key, storedValue, mergedOptions.syncWithFirebase, isOnline])

  // Function to set the value
  const setValue = useCallback(
    (value: T) => {
      try {
        // Allow value to be a function
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Only update if the value is different
        if (JSON.stringify(valueToStore) !== JSON.stringify(storedValue)) {
          // Save to state
          setStoredValue(valueToStore)

          // Save to localStorage
          saveToLocalStorage(valueToStore)

          // Mark as local until synced
          setSyncStatus("local")
        }
      } catch (error) {
        console.warn(`Error setting value for "${key}":`, error)
      }
    },
    [key, storedValue, saveToLocalStorage],
  )

  // Effect for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "You are online",
        description: "Data will now sync automatically",
      })
      syncWithFirebase() // Try to sync when coming back online
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus("offline")
      toast({
        title: "You are offline",
        description: "Changes will be saved locally until you reconnect",
        variant: "destructive",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [syncWithFirebase, toast])

  // Effect for initial sync and real-time updates
  useEffect(() => {
    if (!mergedOptions.syncWithFirebase) return

    let unsubscribe: (() => void) | undefined

    // Initial sync on mount
    const initialSync = async () => {
      if (!isOnline) return

      try {
        setSyncStatus("syncing")
        const firebaseData = await getFromFirebase()

        if (firebaseData && firebaseData[key]) {
          const remoteData = firebaseData[key]
          // Only update if data is different to prevent loops
          if (JSON.stringify(remoteData) !== JSON.stringify(storedValue)) {
            setStoredValue(remoteData)
            saveToLocalStorage(remoteData)
          }

          const currentTime = new Date().toISOString()
          localStorage.setItem(`${key}-last-sync-time`, currentTime)
          setLastSyncTime(currentTime)
          setSyncStatus("synced")
        } else if (storedValue && Object.keys(storedValue).length > 0) {
          // If no data in Firebase but we have local data, push it
          updateFirebaseData(key, storedValue)
            .then(() => {
              const currentTime = new Date().toISOString()
              localStorage.setItem(`${key}-last-sync-time`, currentTime)
              setLastSyncTime(currentTime)
              setSyncStatus("synced")
            })
            .catch(() => setSyncStatus("error"))
        }
      } catch (error) {
        console.error("Error during initial sync:", error)
        setSyncStatus("error")
      }
    }

    initialSync()

    // Subscribe to real-time updates only if online
    if (isOnline) {
      unsubscribe = subscribeToFirebase((data) => {
        if (data && data[key] && data.lastUpdated !== lastSyncTime) {
          const remoteData = data[key]
          // Only update if data is different to prevent loops
          if (JSON.stringify(remoteData) !== JSON.stringify(storedValue)) {
            setStoredValue(remoteData)
            saveToLocalStorage(remoteData)
            setLastSyncTime(data.lastUpdated)
            setSyncStatus("synced")
          }
        }
      })
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [key, mergedOptions.syncWithFirebase, isOnline, saveToLocalStorage, storedValue, lastSyncTime])

  // Separate effect for handling local changes
  useEffect(() => {
    // Don't sync on initial render or when data comes from Firebase
    if (syncStatus !== "local") return

    // Debounce sync operations
    const syncTimer = setTimeout(() => {
      if (isOnline && syncStatus === "local") {
        syncWithFirebase()
      }
    }, 2000) // 2 second debounce

    return () => clearTimeout(syncTimer)
  }, [syncStatus, isOnline, syncWithFirebase])

  // Listen for changes to the stored value in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        setStoredValue(JSON.parse(event.newValue))
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [key])

  return [
    storedValue,
    setValue,
    syncStatus,
    {
      sync: syncWithFirebase,
      lastSyncTime,
      isOnline,
    },
  ]
}
