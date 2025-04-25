"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useLocalStorage } from "./use-local-storage"
import type { SyncStatus } from "../types/erp-types"

// Simple peer-to-peer sync using WebRTC
export function usePeerSync<T>(
  key: string,
  initialValue: T,
): [
  T,
  (value: T) => void,
  SyncStatus,
  {
    deviceId: string
    isOnline: boolean
    lastSyncTime?: string
    connectedPeers: string[]
    sync: () => Promise<boolean>
    connectToPeer: (peerId: string) => Promise<boolean>
  },
] {
  // Use localStorage as the base storage
  const [data, setData] = useLocalStorage<T>(key, initialValue)

  // Generate a unique device ID if not already present
  const [deviceId] = useState(() => {
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem(`${key}-device-id`)
      if (storedId) return storedId

      const newId = `device-${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem(`${key}-device-id`, newId)
      return newId
    }
    return `device-${Math.random().toString(36).substring(2, 9)}`
  })

  // Track sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local")
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(
    typeof window !== "undefined" ? localStorage.getItem(`${key}-last-sync`) || undefined : undefined,
  )
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : false)
  const [connectedPeers, setConnectedPeers] = useState<string[]>([])

  // Track if we're currently syncing
  const isSyncing = useRef(false)

  // Update online status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus((prev) => (prev === "offline" ? "local" : prev))
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus("offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Function to sync data with other peers
  const syncData = useCallback(async (): Promise<boolean> => {
    if (!isOnline || isSyncing.current) return false

    try {
      isSyncing.current = true
      setSyncStatus("syncing")

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In a real implementation, this would use WebRTC to sync with peers
      // For now, we'll just simulate a successful sync

      // Update last sync time
      const now = new Date().toISOString()
      localStorage.setItem(`${key}-last-sync`, now)
      setLastSyncTime(now)

      setSyncStatus("synced")
      return true
    } catch (error) {
      console.error("Error syncing data:", error)
      setSyncStatus("error")
      return false
    } finally {
      isSyncing.current = false
    }
  }, [isOnline, key])

  // Function to connect to another peer
  const connectToPeer = useCallback(
    async (peerId: string): Promise<boolean> => {
      if (!isOnline) return false

      try {
        setSyncStatus("syncing")

        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // In a real implementation, this would establish a WebRTC connection
        // For now, we'll just simulate a successful connection

        setConnectedPeers((prev) => {
          if (prev.includes(peerId)) return prev
          return [...prev, peerId]
        })

        // Simulate successful sync after connection
        const now = new Date().toISOString()
        localStorage.setItem(`${key}-last-sync`, now)
        setLastSyncTime(now)

        setSyncStatus("connected")
        return true
      } catch (error) {
        console.error("Error connecting to peer:", error)
        setSyncStatus("error")
        return false
      }
    },
    [isOnline, key],
  )

  // Custom setter that updates local storage and triggers sync
  const setDataAndSync = useCallback(
    (newValue: T) => {
      setData(newValue)
      setSyncStatus("local")

      // Debounce sync to avoid too many sync attempts
      const timeoutId = setTimeout(() => {
        if (isOnline && !isSyncing.current) {
          syncData()
        }
      }, 2000)

      return () => clearTimeout(timeoutId)
    },
    [setData, syncData, isOnline],
  )

  return [
    data,
    setDataAndSync,
    syncStatus,
    {
      deviceId,
      isOnline,
      lastSyncTime,
      connectedPeers,
      sync: syncData,
      connectToPeer,
    },
  ]
}
