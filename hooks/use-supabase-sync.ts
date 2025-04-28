"use client"

import { useState, useEffect, useCallback } from "react"
import {
  initializeDatabase,
  syncInventory,
  getInventory,
  subscribeToInventory,
  syncTransactions,
  getTransactions,
  subscribeToTransactions,
  syncInwardEntries,
  getInwardEntries,
  subscribeToInwardEntries,
} from "../lib/supabase-client"
import type { InventoryItem, Transaction, InwardEntry } from "../types/erp-types"

export type SyncStatus = "loading" | "synced" | "syncing" | "error" | "offline"

interface SyncInfo {
  lastSyncTime?: string
  isOnline: boolean
  syncStatus: SyncStatus
}

// Hook for inventory sync
export function useInventorySync(
  initialData: InventoryItem[] = [],
): [InventoryItem[], (data: InventoryItem[]) => void, SyncInfo] {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData)
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    syncStatus: "loading",
  })

  // Initialize database and fetch data
  useEffect(() => {
    let isMounted = true
    const initialize = async () => {
      try {
        // Initialize database
        await initializeDatabase()

        // Fetch initial data
        const data = await getInventory()
        if (isMounted && data.length > 0) {
          setInventory(data)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        } else if (isMounted && initialData.length > 0) {
          // If no data in Supabase but we have initial data, sync it
          await syncInventory(initialData)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        }
      } catch (error) {
        console.error("Error initializing inventory sync:", error)
        if (isMounted) {
          setSyncInfo((prev) => ({ ...prev, syncStatus: "error" }))
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [initialData])

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = subscribeToInventory((data) => {
      setInventory(data)
      setSyncInfo((prev) => ({
        ...prev,
        syncStatus: "synced",
        lastSyncTime: new Date().toISOString(),
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Function to update inventory
  const updateInventory = useCallback(
    async (data: InventoryItem[]) => {
      setInventory(data)
      setSyncInfo((prev) => ({ ...prev, syncStatus: "syncing" }))

      try {
        await syncInventory(data)
        setSyncInfo((prev) => ({
          ...prev,
          syncStatus: "synced",
          lastSyncTime: new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Error syncing inventory:", error)
        setSyncInfo((prev) => ({ ...prev, syncStatus: "error" }))
      }
    },
    [setInventory, setSyncInfo],
  )

  return [inventory, updateInventory, syncInfo]
}

// Hook for transactions sync
export function useTransactionsSync(
  initialData: Transaction[] = [],
): [Transaction[], (data: Transaction[]) => void, SyncInfo] {
  const [transactions, setTransactions] = useState<Transaction[]>(initialData)
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    syncStatus: "loading",
  })

  // Initialize database and fetch data
  useEffect(() => {
    let isMounted = true
    const initialize = async () => {
      try {
        // Initialize database
        await initializeDatabase()

        // Fetch initial data
        const data = await getTransactions()
        if (isMounted && data.length > 0) {
          setTransactions(data)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        } else if (isMounted && initialData.length > 0) {
          // If no data in Supabase but we have initial data, sync it
          await syncTransactions(initialData)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        }
      } catch (error) {
        console.error("Error initializing transactions sync:", error)
        if (isMounted) {
          setSyncInfo((prev) => ({ ...prev, syncStatus: "error" }))
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [initialData])

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = subscribeToTransactions((data) => {
      setTransactions(data)
      setSyncInfo((prev) => ({
        ...prev,
        syncStatus: "synced",
        lastSyncTime: new Date().toISOString(),
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Function to update transactions
  const updateTransactions = useCallback(
    async (data: Transaction[]) => {
      setTransactions(data)
      setSyncInfo((prev) => ({ ...prev, syncStatus: "syncing" }))

      try {
        await syncTransactions(data)
        setSyncInfo((prev) => ({
          ...prev,
          syncStatus: "synced",
          lastSyncTime: new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Error syncing transactions:", error)
        setSyncInfo((prev) => ({ ...prev, syncStatus: "error" }))
      }
    },
    [setTransactions, setSyncInfo],
  )

  return [transactions, updateTransactions, syncInfo]
}

// Hook for inward entries sync
export function useInwardEntriesSync(
  initialData: InwardEntry[] = [],
): [InwardEntry[], (data: InwardEntry[]) => void, SyncInfo] {
  const [inwardEntries, setInwardEntries] = useState<InwardEntry[]>(initialData)
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    syncStatus: "loading",
  })

  // Initialize database and fetch data
  useEffect(() => {
    let isMounted = true
    const initialize = async () => {
      try {
        // Initialize database
        await initializeDatabase()

        // Fetch initial data
        const data = await getInwardEntries()
        if (isMounted && data.length > 0) {
          setInwardEntries(data)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        } else if (isMounted && initialData.length > 0) {
          // If no data in Supabase but we have initial data, sync it
          await syncInwardEntries(initialData)
          setSyncInfo((prev) => ({
            ...prev,
            syncStatus: "synced",
            lastSyncTime: new Date().toISOString(),
          }))
        }
      } catch (error) {
        console.error("Error initializing inward entries sync:", error)
        if (isMounted) {
          setSyncInfo((prev) => ({ ...prev, syncStatus: "error" }))
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [initialData])

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = subscribeToInwardEntries((data) => {
      setInwardEntries(data)
      setSyncInfo((prev) => ({
        ...prev,
        syncStatus: "synced",
        lastSyncTime: new Date().toISOString(),
      }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setSyncInfo((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Function to update inward entries
  const updateInwardEntries = useCallback(
    async (data: InwardEntry[]) => {
      setInwardEntries(data)
      setSyncInfo((prev) => ({ ...prev, syncStatus: "syncing" }))

      try {
        await syncInwardEntries(data)
        setSyncInfo((prev) => ({
          ...prev,
          syncStatus: "synced",
          lastSyncTime: new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Error syncing inward entries:", error)
        setSyncInfo((prev) => ({ ...prev, syncStatus: "error" }))
      }
    },
    [setInwardEntries, setSyncInfo],
  )

  return [inwardEntries, updateInwardEntries, syncInfo]
}
