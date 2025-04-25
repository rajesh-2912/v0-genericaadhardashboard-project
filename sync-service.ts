// Peer-to-peer synchronization service using PeerJS
import Peer from "peerjs"
import { nanoid } from "nanoid"

// Types for our data
export type SyncData = {
  inventory: any[]
  transactions: any[]
  inwardEntries: any[]
  lastSyncTime: string
}

export type SyncStatus = "synced" | "syncing" | "local" | "error" | "offline" | "connected" | "disconnected"

class SyncService {
  private peer: Peer | null = null
  private connections: Record<string, Peer.DataConnection> = {}
  private deviceId: string
  private onDataCallback: ((data: SyncData) => void) | null = null
  private onStatusChangeCallback: ((status: SyncStatus, peerId?: string) => void) | null = null
  private lastSyncTime: string = new Date().toISOString()
  private isInitialized = false

  constructor() {
    // Generate or retrieve a persistent device ID
    let storedId = localStorage.getItem("ga-device-id")
    if (!storedId) {
      storedId = `ga-${nanoid(8)}`
      localStorage.setItem("ga-device-id", storedId)
    }
    this.deviceId = storedId
  }

  // Initialize the peer connection
  async initialize(): Promise<string> {
    if (this.isInitialized) return this.deviceId

    try {
      this.peer = new Peer(this.deviceId, {
        debug: 2,
      })

      this.peer.on("open", (id) => {
        console.log("My peer ID is: " + id)
        this.isInitialized = true
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback("connected")
        }
      })

      this.peer.on("connection", (conn) => {
        this.handleConnection(conn)
      })

      this.peer.on("error", (err) => {
        console.error("Peer connection error:", err)
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback("error")
        }
      })

      this.peer.on("disconnected", () => {
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback("disconnected")
        }
      })

      return this.deviceId
    } catch (error) {
      console.error("Failed to initialize peer:", error)
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback("error")
      }
      return this.deviceId
    }
  }

  // Connect to another peer
  async connectToPeer(peerId: string): Promise<boolean> {
    if (!this.peer) {
      await this.initialize()
    }

    if (!this.peer || !this.isInitialized) {
      console.error("Peer not initialized")
      return false
    }

    try {
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback("syncing", peerId)
      }

      const conn = this.peer.connect(peerId, {
        reliable: true,
      })

      return new Promise((resolve) => {
        conn.on("open", () => {
          this.connections[peerId] = conn
          this.handleConnection(conn)

          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback("connected", peerId)
          }

          resolve(true)
        })

        conn.on("error", (err) => {
          console.error("Connection error:", err)
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback("error", peerId)
          }
          resolve(false)
        })
      })
    } catch (error) {
      console.error("Failed to connect to peer:", error)
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback("error", peerId)
      }
      return false
    }
  }

  // Handle incoming connections
  private handleConnection(conn: Peer.DataConnection) {
    this.connections[conn.peer] = conn

    conn.on("data", (data: any) => {
      if (data.type === "sync-request") {
        // Send our data to the peer that requested it
        if (this.onDataCallback) {
          // Request the latest data from our app
          this.onDataCallback({} as SyncData)
        }
      } else if (data.type === "sync-data") {
        // Process incoming sync data
        if (this.onDataCallback && data.payload) {
          this.lastSyncTime = new Date().toISOString()
          this.onDataCallback(data.payload)

          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback("synced", conn.peer)
          }
        }
      }
    })

    conn.on("close", () => {
      delete this.connections[conn.peer]
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback("disconnected", conn.peer)
      }
    })
  }

  // Send data to all connected peers
  sendData(data: SyncData): void {
    if (!this.peer || !this.isInitialized) {
      console.error("Peer not initialized")
      return
    }

    Object.values(this.connections).forEach((conn) => {
      try {
        conn.send({
          type: "sync-data",
          payload: {
            ...data,
            lastSyncTime: new Date().toISOString(),
          },
        })
      } catch (error) {
        console.error("Failed to send data to peer:", error)
      }
    })
  }

  // Request data from all connected peers
  requestData(): void {
    if (!this.peer || !this.isInitialized) {
      console.error("Peer not initialized")
      return
    }

    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback("syncing")
    }

    Object.values(this.connections).forEach((conn) => {
      try {
        conn.send({
          type: "sync-request",
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Failed to request data from peer:", error)
      }
    })
  }

  // Set callback for data updates
  onData(callback: (data: SyncData) => void): void {
    this.onDataCallback = callback
  }

  // Set callback for status changes
  onStatusChange(callback: (status: SyncStatus, peerId?: string) => void): void {
    this.onStatusChangeCallback = callback
  }

  // Disconnect from all peers
  disconnect(): void {
    Object.values(this.connections).forEach((conn) => {
      conn.close()
    })

    this.connections = {}

    if (this.peer) {
      this.peer.disconnect()
    }

    this.isInitialized = false

    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback("disconnected")
    }
  }

  // Get device ID
  getDeviceId(): string {
    return this.deviceId
  }

  // Get connected peers
  getConnectedPeers(): string[] {
    return Object.keys(this.connections)
  }

  // Get last sync time
  getLastSyncTime(): string {
    return this.lastSyncTime
  }
}

// Create a singleton instance
const syncService = new SyncService()
export default syncService
