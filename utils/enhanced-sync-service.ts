/**
 * Enhanced Real-time Synchronization Service
 * Provides immediate, accurate synchronization across multiple devices
 */
import { initializeApp, getApp, type FirebaseApp } from "firebase/app"
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  onDisconnect,
  serverTimestamp,
  push,
  query,
  orderByChild,
  limitToLast,
  update,
  type Database,
} from "firebase/database"
import { getAuth, signInAnonymously, type Auth } from "firebase/auth"
import type { InventoryItem, Transaction, InwardEntry } from "../types/erp-types"

// Firebase configuration
let app: FirebaseApp | null = null
let database: Database | null = null
let auth: Auth | null = null
let firebaseInitialized = false

// Check if we have a stored Firebase config
const getStoredFirebaseConfig = () => {
  try {
    const storedConfig = localStorage.getItem("firebase-config")
    if (storedConfig) {
      return JSON.parse(storedConfig)
    }
  } catch (error) {
    console.error("Error reading Firebase config from localStorage:", error)
  }
  return null
}

// Try to initialize Firebase
const initializeFirebase = () => {
  try {
    // First try to get existing Firebase app
    try {
      app = getApp()
      database = getDatabase(app)
      auth = getAuth(app)
      firebaseInitialized = true
      return true
    } catch (error) {
      // App doesn't exist yet, we'll initialize it below
    }

    // Get stored config if available
    const storedConfig = getStoredFirebaseConfig()

    // Default config with placeholders
    const firebaseConfig = {
      apiKey: storedConfig?.apiKey || "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authDomain: storedConfig?.projectId
        ? `${storedConfig.projectId}.firebaseapp.com`
        : "generic-aadhaar-erp.firebaseapp.com",
      databaseURL: storedConfig?.projectId
        ? `https://${storedConfig.projectId}-default-rtdb.firebaseio.com`
        : "https://generic-aadhaar-erp-default-rtdb.firebaseio.com",
      projectId: storedConfig?.projectId || "generic-aadhaar-erp",
      storageBucket: storedConfig?.projectId
        ? `${storedConfig.projectId}.appspot.com`
        : "generic-aadhaar-erp.appspot.com",
      messagingSenderId: "xxxxxxxxxxxx",
      appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx",
    }

    // Check if we have a valid API key (not the placeholder)
    const hasValidApiKey =
      storedConfig?.apiKey && !storedConfig.apiKey.includes("xxxxxxx") && storedConfig.apiKey.startsWith("AIza")

    if (hasValidApiKey) {
      app = initializeApp(firebaseConfig)
      database = getDatabase(app)
      auth = getAuth(app)
      firebaseInitialized = true
      return true
    } else {
      console.warn("No valid Firebase API key found. Operating in local-only mode.")
      firebaseInitialized = false
      return false
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    firebaseInitialized = false
    return false
  }
}

// Initialize Firebase
initializeFirebase()

// Types for our data
export type SyncData = {
  inventory: InventoryItem[]
  transactions: Transaction[]
  inwardEntries: InwardEntry[]
  lastSyncTime: string
  deviceId: string
}

export type SyncEvent = {
  type: "update" | "delete" | "add"
  path: string
  data?: any
  timestamp: number
  deviceId: string
  id: string
}

export type SyncStatus =
  | "syncing"
  | "synced"
  | "local"
  | "offline"
  | "error"
  | "connected"
  | "disconnected"
  | "no-api-key"

export interface SyncInfo {
  deviceId: string
  isOnline: boolean
  lastSyncTime?: string
  connectedDevices: string[]
  sync: () => Promise<boolean>
  hasValidApiKey: boolean
}

// Generate a unique store ID or retrieve from localStorage
const getStoreId = () => {
  let storeId = localStorage.getItem("ga-store-id")
  if (!storeId) {
    storeId = "store_" + Math.random().toString(36).substring(2, 15)
    localStorage.setItem("ga-store-id", storeId)
  }
  return storeId
}

// Generate a unique device ID or retrieve from localStorage
const getDeviceId = () => {
  let deviceId = localStorage.getItem("ga-device-id")
  if (!deviceId) {
    deviceId = "device_" + Math.random().toString(36).substring(2, 15)
    localStorage.setItem("ga-device-id", deviceId)
  }
  return deviceId
}

// Store ID for this installation
const storeId = getStoreId()
const deviceId = getDeviceId()

class EnhancedSyncService {
  private listeners: Map<string, Function> = new Map()
  private unsubscribers: Map<string, Function> = new Map()
  private isAuthenticated = false
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : false
  private syncStatus: SyncStatus = "local"
  private lastSyncTime: string | null = null
  private pendingChanges: SyncEvent[] = []
  private isProcessingChanges = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private connectedDevices: string[] = []
  private _apiKeyValid = false // Renamed from hasValidApiKey to _apiKeyValid

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline)
      window.addEventListener("offline", this.handleOffline)

      // Initialize online status
      this.isOnline = navigator.onLine

      // Check if Firebase is initialized
      this._apiKeyValid = firebaseInitialized

      // Set initial sync status
      if (!this._apiKeyValid) {
        this.syncStatus = "no-api-key"
      } else if (!this.isOnline) {
        this.syncStatus = "offline"
      } else {
        this.syncStatus = "local"
      }

      // Load last sync time from localStorage
      const savedSyncTime = localStorage.getItem("ga-last-sync-time")
      if (savedSyncTime) {
        this.lastSyncTime = savedSyncTime
        if (this._apiKeyValid && this.isOnline) {
          this.syncStatus = "synced"
        }
      }

      // Load pending changes from localStorage
      const savedPendingChanges = localStorage.getItem("ga-pending-changes")
      if (savedPendingChanges) {
        try {
          this.pendingChanges = JSON.parse(savedPendingChanges)
        } catch (error) {
          console.error("Error parsing pending changes:", error)
          this.pendingChanges = []
        }
      }
    }
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<boolean> {
    // If no valid API key, operate in local-only mode
    if (!this._apiKeyValid) {
      this.syncStatus = "no-api-key"
      return false
    }

    // If offline, operate in offline mode
    if (!this.isOnline) {
      this.syncStatus = "offline"
      return false
    }

    try {
      // Authenticate with Firebase
      await this.authenticate()

      // Set up presence system
      this.setupPresence()

      // Set up heartbeat
      this.setupHeartbeat()

      // Process any pending changes
      this.processPendingChanges()

      return true
    } catch (error) {
      console.error("Error initializing sync service:", error)
      this.syncStatus = "error"
      return false
    }
  }

  /**
   * Authenticate with Firebase
   */
  private async authenticate(): Promise<boolean> {
    if (!auth || !this._apiKeyValid) {
      this.isAuthenticated = false
      return false
    }

    try {
      await signInAnonymously(auth)
      this.isAuthenticated = true
      return true
    } catch (error) {
      console.error("Error authenticating with Firebase:", error)
      this.isAuthenticated = false

      // If authentication fails due to API key, update status
      if (error.toString().includes("api-key-not-valid")) {
        this._apiKeyValid = false
        this.syncStatus = "no-api-key"
      }

      return false
    }
  }

  /**
   * Set up presence system to track connected devices
   */
  private setupPresence() {
    if (!this.isAuthenticated || !database) return

    const presenceRef = ref(database, `stores/${storeId}/presence/${deviceId}`)
    const connectedRef = ref(database, ".info/connected")

    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // We're connected
        const presence = {
          online: true,
          lastSeen: serverTimestamp(),
          deviceId: deviceId,
          userAgent: navigator.userAgent,
        }

        // When this device disconnects, update the presence data
        onDisconnect(presenceRef).update({
          online: false,
          lastSeen: serverTimestamp(),
        })

        // Set the presence data
        set(presenceRef, presence)

        this.syncStatus = "connected"
      } else {
        // We're disconnected
        this.syncStatus = "disconnected"
      }
    })

    // Listen for other connected devices
    const allPresenceRef = ref(database, `stores/${storeId}/presence`)
    onValue(allPresenceRef, (snap) => {
      const presence = snap.val()
      if (presence) {
        const devices = Object.keys(presence).filter((id) => id !== deviceId && presence[id].online)
        this.connectedDevices = devices
      }
    })
  }

  /**
   * Set up heartbeat to keep connection alive
   */
  private setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isAuthenticated && this.isOnline && database) {
        const presenceRef = ref(database, `stores/${storeId}/presence/${deviceId}/lastSeen`)
        set(presenceRef, serverTimestamp())
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Handle online event
   */
  private handleOnline = () => {
    this.isOnline = true

    if (!this._apiKeyValid) {
      this.syncStatus = "no-api-key"
    } else {
      this.syncStatus = "local"
      // Try to reconnect
      this.reconnect()
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline = () => {
    this.isOnline = false
    this.syncStatus = "offline"

    // Clear any reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  /**
   * Reconnect to Firebase
   */
  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectTimeout = setTimeout(async () => {
      if (this.isOnline && this._apiKeyValid) {
        await this.initialize()
        this.processPendingChanges()
      }
    }, 1000) // Wait 1 second before reconnecting
  }

  /**
   * Process any pending changes
   */
  private async processPendingChanges() {
    if (
      this.isProcessingChanges ||
      !this.isOnline ||
      !this.isAuthenticated ||
      this.pendingChanges.length === 0 ||
      !database
    ) {
      return
    }

    this.isProcessingChanges = true
    this.syncStatus = "syncing"

    try {
      // Sort changes by timestamp
      const sortedChanges = [...this.pendingChanges].sort((a, b) => a.timestamp - b.timestamp)

      for (const change of sortedChanges) {
        await this.pushChangeToServer(change)

        // Remove from pending changes
        this.pendingChanges = this.pendingChanges.filter((c) => c.id !== change.id)

        // Update localStorage
        localStorage.setItem("ga-pending-changes", JSON.stringify(this.pendingChanges))
      }

      this.syncStatus = "synced"
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)
      this.lastSyncTime = currentTime
    } catch (error) {
      console.error("Error processing pending changes:", error)
      this.syncStatus = "error"
    } finally {
      this.isProcessingChanges = false
    }
  }

  /**
   * Push a change to the server
   */
  private async pushChangeToServer(change: SyncEvent): Promise<boolean> {
    if (!this.isAuthenticated || !database) return false

    try {
      const eventsRef = ref(database, `stores/${storeId}/events`)
      const newEventRef = push(eventsRef)

      await set(newEventRef, {
        ...change,
        serverTimestamp: serverTimestamp(),
      })

      return true
    } catch (error) {
      console.error("Error pushing change to server:", error)
      return false
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribe<T>(path: string, initialData: T, callback: (data: T) => void): () => void {
    if (this.unsubscribers.has(path)) {
      // Unsubscribe from existing subscription
      const unsubscribe = this.unsubscribers.get(path) as Function
      unsubscribe()
    }

    this.listeners.set(path, callback)

    // If offline or no valid API key, just return the unsubscribe function
    if (!this.isOnline || !this.isAuthenticated || !database || !this._apiKeyValid) {
      return () => {
        this.listeners.delete(path)
      }
    }

    // Subscribe to the data
    const dataRef = ref(database, `stores/${storeId}/data/${path}`)
    const eventsRef = query(ref(database, `stores/${storeId}/events`), orderByChild("path"), limitToLast(100))

    // First, get the current data
    get(dataRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          callback(data)
        } else {
          // If no data exists, push the initial data
          set(dataRef, initialData)
          callback(initialData)
        }
      })
      .catch((error) => {
        console.error(`Error getting data for ${path}:`, error)
      })

    // Then, listen for events
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      if (!snapshot.exists()) return

      const events = snapshot.val()

      // Process events
      Object.values(events).forEach((event: any) => {
        if (event.path === path && event.deviceId !== deviceId) {
          // This is an event for our path from another device
          if (event.type === "update") {
            callback(event.data)
          }
        }
      })
    })

    this.unsubscribers.set(path, unsubscribe)

    return () => {
      if (this.unsubscribers.has(path)) {
        const unsubscribe = this.unsubscribers.get(path) as Function
        unsubscribe()
        this.unsubscribers.delete(path)
      }
      this.listeners.delete(path)
    }
  }

  /**
   * Update data
   */
  async update<T>(path: string, data: T): Promise<boolean> {
    // Create a change event
    const change: SyncEvent = {
      type: "update",
      path,
      data,
      timestamp: Date.now(),
      deviceId,
      id: `${deviceId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }

    // If offline, no valid API key, or not authenticated, add to pending changes
    if (!this.isOnline || !this.isAuthenticated || !database || !this._apiKeyValid) {
      this.pendingChanges.push(change)
      localStorage.setItem("ga-pending-changes", JSON.stringify(this.pendingChanges))
      this.syncStatus = this._apiKeyValid ? "local" : "no-api-key"
      return true
    }

    // Otherwise, push to server immediately
    this.syncStatus = "syncing"

    try {
      // Update the data
      const dataRef = ref(database, `stores/${storeId}/data/${path}`)
      await set(dataRef, data)

      // Push the event
      await this.pushChangeToServer(change)

      this.syncStatus = "synced"
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)
      this.lastSyncTime = currentTime

      return true
    } catch (error) {
      console.error(`Error updating ${path}:`, error)

      // Add to pending changes
      this.pendingChanges.push(change)
      localStorage.setItem("ga-pending-changes", JSON.stringify(this.pendingChanges))

      this.syncStatus = "error"
      return false
    }
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<boolean> {
    if (!this.isOnline) {
      return false
    }

    if (!this._apiKeyValid) {
      this.syncStatus = "no-api-key"
      return false
    }

    this.syncStatus = "syncing"

    try {
      // Re-authenticate if needed
      if (!this.isAuthenticated) {
        await this.authenticate()
      }

      // Process any pending changes
      await this.processPendingChanges()

      this.syncStatus = "synced"
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)
      this.lastSyncTime = currentTime

      return true
    } catch (error) {
      console.error("Error during force sync:", error)
      this.syncStatus = "error"
      return false
    }
  }

  /**
   * Update Firebase configuration
   */
  updateFirebaseConfig(apiKey: string, projectId: string): boolean {
    try {
      // Save the new configuration
      localStorage.setItem(
        "firebase-config",
        JSON.stringify({
          apiKey,
          projectId,
        }),
      )

      // Reinitialize Firebase
      const success = initializeFirebase()
      this._apiKeyValid = success

      if (success) {
        this.syncStatus = this.isOnline ? "local" : "offline"
        // Try to initialize the sync service
        this.initialize()
      } else {
        this.syncStatus = "no-api-key"
      }

      return success
    } catch (error) {
      console.error("Error updating Firebase configuration:", error)
      return false
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): string | null {
    return this.lastSyncTime
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return deviceId
  }

  /**
   * Get connected devices
   */
  getConnectedDevices(): string[] {
    return this.connectedDevices
  }

  /**
   * Check if we have a valid API key
   */
  isApiKeyValid(): boolean {
    return this._apiKeyValid
  }

  /**
   * Clean up
   */
  cleanup() {
    // Remove event listeners
    window.removeEventListener("online", this.handleOnline)
    window.removeEventListener("offline", this.handleOffline)

    // Clear intervals and timeouts
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Unsubscribe from all subscriptions
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })

    this.unsubscribers.clear()
    this.listeners.clear()
  }
}

// Create a singleton instance
const enhancedSyncService = new EnhancedSyncService()
export default enhancedSyncService

export function createEnhancedSyncService<T>(collectionName: string, deviceId: string) {
  // References to Firebase paths
  const collectionRef = database ? ref(database, `data/${collectionName}`) : null
  const deviceStatusRef = database ? ref(database, `status/${deviceId}`) : null
  const statusRef = database ? ref(database, "status") : null

  // Local state
  let localData: T
  let lastSyncTime: string | undefined
  let isOnline = typeof navigator !== "undefined" ? navigator.onLine : false
  let connectedDevices: string[] = []
  let syncStatus: SyncStatus = firebaseInitialized ? "local" : "no-api-key"
  let listeners: Array<(data: T, status: SyncStatus, info: SyncInfo) => void> = []
  let isNotifying = false // Flag to prevent recursive notifications

  // Set up device presence
  const setupPresence = () => {
    if (typeof window === "undefined" || !database || !firebaseInitialized) return

    // Set device as online when connected
    const connectionRef = ref(database, ".info/connected")
    onValue(connectionRef, (snapshot) => {
      if (snapshot.val() === true && deviceStatusRef) {
        // Add this device to the list of online devices
        const deviceData = {
          online: true,
          lastSeen: serverTimestamp(),
          name: deviceId,
        }

        // Remove device when disconnected
        onDisconnect(deviceStatusRef).update({ online: false })

        // Set device as online
        update(deviceStatusRef, deviceData)
      }
    })

    // Listen for other devices
    if (statusRef) {
      onValue(statusRef, (snapshot) => {
        if (!snapshot.exists()) return

        const devices: string[] = []
        snapshot.forEach((childSnapshot) => {
          const deviceData = childSnapshot.val()
          if (deviceData.online && childSnapshot.key !== deviceId) {
            devices.push(deviceData.name || childSnapshot.key || "Unknown device")
          }
        })

        // Only update and notify if devices have changed
        if (JSON.stringify(devices) !== JSON.stringify(connectedDevices)) {
          connectedDevices = devices
          notifyListeners()
        }
      })
    }
  }

  // Initialize data sync
  const initSync = () => {
    // If Firebase is not initialized, don't try to sync
    if (!database || !firebaseInitialized || !collectionRef) return

    // Listen for changes in the collection
    onValue(
      collectionRef,
      (snapshot) => {
        if (!snapshot.exists()) return

        try {
          const serverData = snapshot.val()

          // Only update if data has changed
          if (JSON.stringify(serverData) !== JSON.stringify(localData)) {
            localData = serverData
            lastSyncTime = new Date().toISOString()
            syncStatus = "synced"
            notifyListeners()
          }
        } catch (error) {
          console.error(`Error syncing ${collectionName}:`, error)
          syncStatus = "error"
          notifyListeners()
        }
      },
      (error) => {
        console.error(`Error in ${collectionName} sync listener:`, error)
        syncStatus = "error"
        notifyListeners()
      },
    )
  }

  // Push local changes to server
  const pushChanges = async (data: T): Promise<boolean> => {
    if (!isOnline) {
      syncStatus = "offline"
      notifyListeners()
      return false
    }

    if (!firebaseInitialized || !database || !collectionRef) {
      syncStatus = "no-api-key"
      notifyListeners()
      return false
    }

    try {
      syncStatus = "syncing"
      notifyListeners()

      // Add metadata to track changes
      const changeData = {
        data,
        updatedAt: serverTimestamp(),
        updatedBy: deviceId,
      }

      await set(collectionRef, data)

      lastSyncTime = new Date().toISOString()
      syncStatus = "synced"
      notifyListeners()
      return true
    } catch (error) {
      console.error(`Error pushing changes to ${collectionName}:`, error)
      syncStatus = "error"
      notifyListeners()
      return false
    }
  }

  // Force sync with server
  const forceSync = async (): Promise<boolean> => {
    if (!isOnline) {
      syncStatus = "offline"
      notifyListeners()
      return false
    }

    if (!firebaseInitialized || !database || !collectionRef) {
      syncStatus = "no-api-key"
      notifyListeners()
      return false
    }

    try {
      syncStatus = "syncing"
      notifyListeners()

      // Get latest data from server
      const snapshot = await get(collectionRef)

      if (snapshot.exists()) {
        const serverData = snapshot.val()

        // Only update if data has changed
        if (JSON.stringify(serverData) !== JSON.stringify(localData)) {
          localData = serverData
        }
      } else {
        // If no data exists yet, push local data
        await set(collectionRef, localData)
      }

      lastSyncTime = new Date().toISOString()
      syncStatus = "synced"
      notifyListeners()
      return true
    } catch (error) {
      console.error(`Error in force sync for ${collectionName}:`, error)
      syncStatus = "error"
      notifyListeners()
      return false
    }
  }

  // Update online status
  const updateOnlineStatus = (online: boolean) => {
    if (isOnline === online) return // Only update if changed

    isOnline = online

    if (online && firebaseInitialized) {
      // When coming back online, try to sync
      forceSync().catch(console.error)
    } else {
      syncStatus = online ? "local" : "offline"
      if (!firebaseInitialized) {
        syncStatus = "no-api-key"
      }
      notifyListeners()
    }
  }

  // Set up online/offline listeners
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => updateOnlineStatus(true))
    window.addEventListener("offline", () => updateOnlineStatus(false))
  }

  // Notify all listeners of changes
  const notifyListeners = () => {
    // Prevent recursive notifications
    if (isNotifying) return

    isNotifying = true

    try {
      const syncInfo: SyncInfo = {
        deviceId,
        isOnline,
        lastSyncTime,
        connectedDevices,
        sync: forceSync,
        hasValidApiKey: firebaseInitialized,
      }

      listeners.forEach((listener) => {
        try {
          listener(localData, syncStatus, syncInfo)
        } catch (error) {
          console.error("Error in sync listener callback:", error)
        }
      })
    } finally {
      isNotifying = false
    }
  }

  // Initialize
  if (firebaseInitialized) {
    setupPresence()
    initSync()
  }

  // Return the API
  return {
    subscribe: (initialData: T, listener: (data: T, status: SyncStatus, info: SyncInfo) => void) => {
      localData = initialData
      listeners.push(listener)

      // Schedule notification on next tick to avoid immediate re-renders
      setTimeout(() => {
        notifyListeners()
      }, 0)

      return () => {
        listeners = listeners.filter((l) => l !== listener)
      }
    },

    updateData: (data: T) => {
      // Only update if data has changed
      if (JSON.stringify(data) !== JSON.stringify(localData)) {
        localData = data

        // Always save to localStorage
        try {
          localStorage.setItem(`ga-${collectionName}`, JSON.stringify(data))
        } catch (error) {
          console.error(`Error saving to localStorage:`, error)
        }

        // Only try to sync if Firebase is initialized
        if (firebaseInitialized) {
          pushChanges(data).catch(console.error)
        } else {
          syncStatus = "no-api-key"
          notifyListeners()
        }
      }
    },

    forceSync,

    getStatus: () => ({
      status: syncStatus,
      lastSyncTime,
      isOnline,
      connectedDevices,
      deviceId,
      hasValidApiKey: firebaseInitialized,
    }),
  }
}
