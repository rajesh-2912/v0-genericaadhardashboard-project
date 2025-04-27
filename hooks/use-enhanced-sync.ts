"use client"

import { useState, useEffect, useRef } from "react"
import enhancedSyncService, { type SyncStatus, type SyncInfo } from "../utils/enhanced-sync-service"

// Check if we're in the browser environment
const isBrowser = typeof window !== "undefined"

export function useEnhancedSync<T>(key: string, initialData: T): [T, (data: T) => void, SyncStatus, SyncInfo] {
  // State for data and sync status
  const [data, setData] = useState<T>(initialData)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local")
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    deviceId: isBrowser ? enhancedSyncService.getDeviceId() : "server",
    isOnline: isBrowser ? navigator.onLine : false,
    lastSyncTime: isBrowser ? enhancedSyncService.getLastSyncTime() || undefined : undefined,
    connectedDevices: isBrowser ? enhancedSyncService.getConnectedDevices() : [],
    sync: async () => {
      if (!isBrowser) return false
      return await enhancedSyncService.forceSync()
    },
    hasValidApiKey: isBrowser ? enhancedSyncService.isApiKeyValid() : false,
  })

  // Use refs to avoid stale closures and prevent unnecessary re-renders
  const dataRef = useRef(data)
  dataRef.current = data

  const initializedRef = useRef(false)

  // Initialize from localStorage only once
  useEffect(() => {
    if (!isBrowser || initializedRef.current) return

    initializedRef.current = true

    try {
      const item = window.localStorage.getItem(`ga-${key}`)
      if (item) {
        const parsedData = JSON.parse(item)
        setData(parsedData)
      } else {
        window.localStorage.setItem(`ga-${key}`, JSON.stringify(initialData))
      }
    } catch (error) {
      console.error(`Error reading localStorage key "ga-${key}":`, error)
    }
  }, [key, initialData])

  // Initialize sync service once
  useEffect(() => {
    if (!isBrowser) return

    let isMounted = true

    // Check if we have a valid API key
    const hasValidApiKey = enhancedSyncService.isApiKeyValid()

    // Set initial status based on API key availability
    if (!hasValidApiKey) {
      setSyncStatus("no-api-key")
    }

    enhancedSyncService.initialize().then(() => {
      if (!isMounted) return

      setSyncStatus(enhancedSyncService.getSyncStatus())
      setSyncInfo((prev) => ({
        ...prev,
        lastSyncTime: enhancedSyncService.getLastSyncTime() || undefined,
        hasValidApiKey: enhancedSyncService.isApiKeyValid(),
      }))
    })

    // Set up a single interval to update connected devices and status
    const interval = setInterval(() => {
      if (!isMounted) return

      const newStatus = enhancedSyncService.getSyncStatus()
      const newLastSyncTime = enhancedSyncService.getLastSyncTime() || undefined
      const newConnectedDevices = enhancedSyncService.getConnectedDevices()
      const newHasValidApiKey = enhancedSyncService.isApiKeyValid()

      // Only update if values have changed to prevent unnecessary re-renders
      setSyncStatus((prevStatus) => (prevStatus !== newStatus ? newStatus : prevStatus))

      setSyncInfo((prev) => {
        // Only update if any values have changed
        if (
          prev.lastSyncTime !== newLastSyncTime ||
          prev.connectedDevices.length !== newConnectedDevices.length ||
          prev.hasValidApiKey !== newHasValidApiKey ||
          !prev.connectedDevices.every((device, i) => device === newConnectedDevices[i])
        ) {
          return {
            ...prev,
            connectedDevices: newConnectedDevices,
            lastSyncTime: newLastSyncTime,
            hasValidApiKey: newHasValidApiKey,
          }
        }
        return prev
      })
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, []) // Empty dependency array to run only once

  // Subscribe to changes
  useEffect(() => {
    if (!isBrowser) return

    let isMounted = true

    const unsubscribe = enhancedSyncService.subscribe<T>(key, dataRef.current, (newData) => {
      if (!isMounted) return

      // Only update if data has actually changed
      if (JSON.stringify(newData) !== JSON.stringify(dataRef.current)) {
        setData(newData)

        // Also update localStorage
        try {
          window.localStorage.setItem(`ga-${key}`, JSON.stringify(newData))
        } catch (error) {
          console.error(`Error writing to localStorage key "ga-${key}":`, error)
        }
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [key]) // Only re-subscribe when key changes

  // Update online status
  useEffect(() => {
    if (!isBrowser) return

    let isMounted = true

    const handleOnline = () => {
      if (!isMounted) return
      setSyncInfo((prev) => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      if (!isMounted) return
      setSyncInfo((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      isMounted = false
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Function to update data
  const updateData = (value: T) => {
    if (!isBrowser) return

    // Allow value to be a function
    const valueToStore = value instanceof Function ? value(dataRef.current) : value

    // Save to state
    setData(valueToStore)

    // Save to localStorage
    try {
      window.localStorage.setItem(`ga-${key}`, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error writing to localStorage key "ga-${key}":`, error)
    }

    // Update via sync service
    enhancedSyncService.update(key, valueToStore).catch((error) => {
      console.error(`Error updating sync service for key "${key}":`, error)
    })
  }

  return [data, updateData, syncStatus, syncInfo]
}
