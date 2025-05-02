/**
 * Reliable Sync Service
 * Enhanced synchronization with better error handling and device coordination
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
  if (typeof window === "undefined") {
    return null
  }

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
      apiKey:
        storedConfig?.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authDomain: storedConfig?.projectId
        ? `${storedConfig.projectId}.firebaseapp.com`
        : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "generic-aadhaar-erp.firebaseapp.com",
      databaseURL: storedConfig?.projectId
        ? `https://${storedConfig.projectId}-default-rtdb.firebaseio.com`
        : process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://generic-aadhaar-erp-default-rtdb.firebaseio.com",
      projectId: storedConfig?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "generic-aadhaar-erp",
      storageBucket: storedConfig?.projectId
        ? `${storedConfig.projectId}.appspot.com`
        : process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "generic-aadhaar-erp.appspot.com",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "xxxxxxxxxxxx",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx",
    }

    // Check if we have a valid API key (not the placeholder)
    const hasValidApiKey =
      (storedConfig?.apiKey && !storedConfig.apiKey.includes("xxxxxxx") && storedConfig.apiKey.startsWith("AIza")) ||
      (process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("xxxxxxx") &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY.startsWith("AIza"))

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
  | "auth-disabled"

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
  if (typeof window === "undefined") {
    return "default_store_id"
  }

  let storeId = localStorage.getItem("ga-store-id")
  if (!storeId) {
    storeId = "store_" + Math.random().toString(36).substring(2, 15)
    localStorage.setItem("ga-store-id", storeId)
  }
  return storeId
}

// Generate a unique device ID or retrieve from localStorage
const getDeviceId = () => {
  if (typeof window === "undefined") {
    return "default_device_id"
  }

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

export class ReliableSyncService {
  private listeners: Map<string, Function[]> = new Map()
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
  private _apiKeyValid = false
  private _authEnabled = true
  private dataCache: Map<string, any> = new Map()
  private syncRetryCount = 0
  private maxSyncRetries = 5
  private syncRetryDelay = 5000 // 5 seconds

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

      // Load data cache from localStorage
      const savedDataCache = localStorage.getItem("ga-data-cache")
      if (savedDataCache) {
        try {
          const parsedCache = JSON.parse(savedDataCache)
          Object.keys(parsedCache).forEach((key) => {
            this.dataCache.set(key, parsedCache[key])
          })
        } catch (error) {
          console.error("Error parsing data cache:", error)
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
      const authResult = await this.authenticate()

      if (!authResult) {
        // If authentication fails, we'll operate in local-only mode
        return false
      }

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
      this._authEnabled = true
      return true
    } catch (error: any) {
      console.error("Error authenticating with Firebase:", error)
      this.isAuthenticated = false

      // Check for specific error codes
      if (error.code === "auth/admin-restricted-operation") {
        console.warn("Anonymous authentication is disabled for this Firebase project. Operating in local-only mode.")
        this._authEnabled = false
        this.syncStatus = "auth-disabled"

        // Even though anonymous auth is disabled, we can still use Firebase for data storage
        // We'll just operate without authentication
        if (database) {
          this.isAuthenticated = true
          return true
        }
      } else if (error.toString().includes("api-key-not-valid")) {
        this._apiKeyValid = false
        this.syncStatus = "no-api-key"
      } else {
        this.syncStatus = "error"
      }

      return false
    }
  }

  /**
   * Set up presence system to track connected devices
   */
  private setupPresence() {
    if (!database) return

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
      if (this.isOnline && database) {
        const presenceRef = ref(database, `stores/${storeId}/presence/${deviceId}/lastSeen`)
        set(presenceRef, serverTimestamp()).catch((error) => {
          console.error("Error updating heartbeat:", error)
        })
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
    } else if (!this._authEnabled) {
      this.syncStatus = "auth-disabled"
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
    if (this.isProcessingChanges || !this.isOnline || this.pendingChanges.length === 0 || !database) {
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

      // Reset retry count on success
      this.syncRetryCount = 0
    } catch (error) {
      console.error("Error processing pending changes:", error)
      this.syncStatus = "error"

      // Retry with exponential backoff
      if (this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++
        const delay = this.syncRetryDelay * Math.pow(2, this.syncRetryCount - 1)

        setTimeout(() => {
          this.processPendingChanges()
        }, delay)
      }
    } finally {
      this.isProcessingChanges = false
    }
  }

  /**
   * Push a change to the server
   */
  private async pushChangeToServer(change: SyncEvent): Promise<boolean> {
    if (!database) return false

    try {
      // Even if authentication is disabled, we can still try to write data
      const eventsRef = ref(database, `stores/${storeId}/events`)
      const newEventRef = push(eventsRef)

      await set(newEventRef, {
        ...change,
        serverTimestamp: serverTimestamp(),
      })

      // Also update the data directly
      if (change.type === "update" && change.path && change.data) {
        const dataRef = ref(database, `stores/${storeId}/data/${change.path}`)
        await set(dataRef, change.data)
      }

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
    // Initialize listeners array for this path if it doesn't exist
    if (!this.listeners.has(path)) {
      this.listeners.set(path, [])
    }

    // Add this callback to the listeners
    const pathListeners = this.listeners.get(path) || []
    pathListeners.push(callback)
    this.listeners.set(path, pathListeners)

    // If we have cached data, use it immediately
    if (this.dataCache.has(path)) {
      const cachedData = this.dataCache.get(path)
      setTimeout(() => callback(cachedData), 0)
    } else {
      // Otherwise use initial data
      this.dataCache.set(path, initialData)
      this.saveDataCache()
    }

    // If offline, no valid API key, or auth disabled, just return the unsubscribe function
    if (!this.isOnline || !database || !this._apiKeyValid) {
      return () => {
        this.unsubscribeListener(path, callback)
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
          this.dataCache.set(path, data)
          this.saveDataCache()
          this.notifyListeners(path, data)
        } else {
          // If no data exists, push the initial data
          set(dataRef, initialData)
            .then(() => {
              this.dataCache.set(path, initialData)
              this.saveDataCache()
            })
            .catch((error) => {
              console.error(`Error setting initial data for ${path}:`, error)
            })
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
            this.dataCache.set(path, event.data)
            this.saveDataCache()
            this.notifyListeners(path, event.data)
          }
        }
      })
    })

    // Also listen for direct data changes
    const dataUnsubscribe = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        this.dataCache.set(path, data)
        this.saveDataCache()
        this.notifyListeners(path, data)
      }
    })

    // Store the unsubscribe function
    const combinedUnsubscribe = () => {
      unsubscribe()
      dataUnsubscribe()
    }

    this.unsubscribers.set(path, combinedUnsubscribe)

    return () => {
      this.unsubscribeListener(path, callback)

      // If this was the last listener for this path, unsubscribe from Firebase
      const remainingListeners = this.listeners.get(path) || []
      if (remainingListeners.length === 0) {
        if (this.unsubscribers.has(path)) {
          const unsubscribe = this.unsubscribers.get(path) as Function
          unsubscribe()
          this.unsubscribers.delete(path)
        }
      }
    }
  }

  /**
   * Unsubscribe a specific listener
   */
  private unsubscribeListener(path: string, callback: Function) {
    const pathListeners = this.listeners.get(path) || []
    const index = pathListeners.indexOf(callback as any)
    if (index !== -1) {
      pathListeners.splice(index, 1)
      this.listeners.set(path, pathListeners)
    }
  }

  /**
   * Notify all listeners for a path
   */
  private notifyListeners(path: string, data: any) {
    const pathListeners = this.listeners.get(path) || []
    pathListeners.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        console.error(`Error in listener for ${path}:`, error)
      }
    })
  }

  /**
   * Save data cache to localStorage
   */
  private saveDataCache() {
    if (typeof window === "undefined") return

    try {
      const cacheObject: Record<string, any> = {}
      this.dataCache.forEach((value, key) => {
        cacheObject[key] = value
      })
      localStorage.setItem("ga-data-cache", JSON.stringify(cacheObject))
    } catch (error) {
      console.error("Error saving data cache to localStorage:", error)
    }
  }

  /**
   * Update data
   */
  async update<T>(path: string, data: T): Promise<boolean> {
    // Update local cache immediately
    this.dataCache.set(path, data)
    this.saveDataCache()

    // Notify listeners
    this.notifyListeners(path, data)

    // Create a change event
    const change: SyncEvent = {
      type: "update",
      path,
      data,
      timestamp: Date.now(),
      deviceId,
      id: `${deviceId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }

    // If offline, no valid API key, not authenticated, or auth disabled, add to pending changes
    if (!this.isOnline || !database || !this._apiKeyValid) {
      this.pendingChanges.push(change)
      localStorage.setItem("ga-pending-changes", JSON.stringify(this.pendingChanges))

      if (!this._apiKeyValid) {
        this.syncStatus = "no-api-key"
      } else if (!this._authEnabled) {
        this.syncStatus = "auth-disabled"
      } else {
        this.syncStatus = "local"
      }

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
      // Process any pending changes
      await this.processPendingChanges()

      // Fetch all data from server
      if (database) {
        const dataRef = ref(database, `stores/${storeId}/data`)
        const snapshot = await get(dataRef)

        if (snapshot.exists()) {
          const serverData = snapshot.val()

          // Update local cache with server data
          Object.keys(serverData).forEach((path) => {
            this.dataCache.set(path, serverData[path])
            this.notifyListeners(path, serverData[path])
          })

          this.saveDataCache()
        }
      }

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
      this._authEnabled = true // Reset auth enabled flag when config changes

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
   * Check if authentication is enabled
   */
  isAuthEnabled(): boolean {
    return this._authEnabled
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
export const reliableSyncService = new ReliableSyncService()
