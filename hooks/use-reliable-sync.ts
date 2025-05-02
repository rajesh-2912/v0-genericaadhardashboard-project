"use client"

import { useState, useEffect, useCallback } from "react"
import { reliableSyncService, type SyncStatus, type SyncInfo } from "../utils/reliable-sync-service"

/**
 * Hook for reliable data synchronization
 */
export function useReliableSync<T>(
  path: string,
  initialData: T,
): [T, (data: T) => Promise<boolean>, SyncStatus, SyncInfo] {
  const [data, setData] = useState<T>(initialData)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(reliableSyncService.getSyncStatus())
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(reliableSyncService.getLastSyncTime())
  const [connectedDevices, setConnectedDevices] = useState<string[]>(reliableSyncService.getConnectedDevices())
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : false)
  const [hasValidApiKey, setHasValidApiKey] = useState<boolean>(reliableSyncService.isApiKeyValid())
  const [deviceId, setDeviceId] = useState<string>(reliableSyncService.getDeviceId())

  // Initialize the sync service
  useEffect(() => {
    reliableSyncService.initialize()
  }, [])

  // Subscribe to data changes
  useEffect(() => {
    const unsubscribe = reliableSyncService.subscribe(path, initialData, (newData) => {
      setData(newData)
    })

    // Set up status check interval
    const statusInterval = setInterval(() => {
      setSyncStatus(reliableSyncService.getSyncStatus())
      setLastSyncTime(reliableSyncService.getLastSyncTime())
      setConnectedDevices(reliableSyncService.getConnectedDevices())
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false)
      setHasValidApiKey(reliableSyncService.isApiKeyValid())
      setDeviceId(reliableSyncService.getDeviceId())
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(statusInterval)
    }
  }, [path, initialData])

  // Update data
  const updateData = useCallback(
    async (newData: T) => {
      return reliableSyncService.update(path, newData)
    },
    [path],
  )

  // Create sync info object
  const syncInfo: SyncInfo = {
    deviceId,
    isOnline,
    lastSyncTime: lastSyncTime || undefined,
    connectedDevices,
    sync: async () => reliableSyncService.forceSync(),
    hasValidApiKey,
  }

  // Return data, update function, sync status, and sync info
  return [data, updateData, syncStatus, syncInfo]
}

/**
 * Hook for updating Firebase configuration
 */
export function useFirebaseConfig(): [(apiKey: string, projectId: string) => boolean, boolean] {
  const [isValid, setIsValid] = useState<boolean>(reliableSyncService.isApiKeyValid())

  // Update Firebase configuration
  const updateConfig = useCallback((apiKey: string, projectId: string) => {
    const success = reliableSyncService.updateFirebaseConfig(apiKey, projectId)
    setIsValid(success)
    return success
  }, [])

  return [updateConfig, isValid]
}

// Specific hooks for different data types
export function useInventorySync(initialData = []) {
  return useReliableSync("inventory", initialData)
}

export function useTransactionsSync(initialData = []) {
  return useReliableSync("transactions", initialData)
}

export function useInwardEntriesSync(initialData = []) {
  return useReliableSync("inwardEntries", initialData)
}
