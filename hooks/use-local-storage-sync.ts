"use client"

import { useState, useEffect, useCallback, useRef } from "react"

// Define types
export type SyncStatus = "loading" | "synced" | "syncing" | "error" | "offline"

export interface SyncInfo {
  lastSyncTime?: string
  isOnline: boolean
  syncStatus: SyncStatus
}

// Generic hook for any data type
export function useLocalStorageSync<T>(
  key: string,
  initialData: T[] = [] as T[],
): [T[], (data: T[]) => void, SyncInfo] {
  // Use refs to track initialization state
  const isInitializedRef = useRef(false)

  const [data, setData] = useState<T[]>(initialData)
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    syncStatus: "synced",
    lastSyncTime: new Date().toISOString(),
  })

  // Handle online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setSyncInfo((prev) => ({
        ...prev,
        isOnline: true,
        syncStatus: "synced",
        lastSyncTime: new Date().toISOString(),
      }))
    }

    const handleOffline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: false, syncStatus: "offline" }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Function to update data with localStorage persistence
  const updateData = useCallback(
    (newData: T[]) => {
      setData(newData)

      // Save to localStorage if available
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(key, JSON.stringify(newData))
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        } catch (error) {
          console.error(`Error saving ${key} to localStorage:`, error)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "error",
          }))
        }
      }
    },
    [key],
  )

  // Load from localStorage on initial render only once
  useEffect(() => {
    if (typeof window === "undefined" || isInitializedRef.current) return

    isInitializedRef.current = true

    try {
      const storedData = localStorage.getItem(key)
      if (storedData) {
        setData(JSON.parse(storedData))
        setSyncInfo((prev) => ({
          ...prev,
          syncStatus: "synced",
          lastSyncTime: new Date().toISOString(),
        }))
      } else if (initialData.length > 0) {
        // If no stored data but we have initial data, save it
        localStorage.setItem(key, JSON.stringify(initialData))
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error)
      setSyncInfo((prev) => ({
        ...prev,
        syncStatus: "error",
      }))
    }
  }, [key, initialData])

  return [data, updateData, syncInfo]
}

// Specific hooks for different data types
export function useInventorySync(initialData = []) {
  return useLocalStorageSync("ga-inventory", initialData)
}

export function useTransactionsSync(initialData = []) {
  return useLocalStorageSync("ga-transactions", initialData)
}

export function useInwardEntriesSync(initialData = []) {
  return useLocalStorageSync("ga-inward-entries", initialData)
}
