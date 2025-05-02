// Firebase configuration for real-time database
import { initializeApp, getApp } from "firebase/app"
import { getDatabase, ref, set, onValue, off, update, get, onDisconnect, serverTimestamp } from "firebase/database"
import { getAuth, signInAnonymously } from "firebase/auth"

// Check if Firebase is already initialized to prevent duplicate initializations
let app: any
let database: any
let auth: any
let isAuthEnabled = true

try {
  // Get existing Firebase app if it exists
  app = getApp()
  database = getDatabase(app)
  auth = getAuth(app)
} catch (error) {
  // Initialize Firebase if no app exists
  const firebaseConfig = {
    apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your Firebase API key
    authDomain: "generic-aadhaar-erp.firebaseapp.com",
    databaseURL: "https://generic-aadhaar-erp-default-rtdb.firebaseio.com",
    projectId: "generic-aadhaar-erp",
    storageBucket: "generic-aadhaar-erp.appspot.com",
    messagingSenderId: "xxxxxxxxxxxx",
    appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx",
  }
  app = initializeApp(firebaseConfig)
  database = getDatabase(app)
  auth = getAuth(app)
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

// Sign in anonymously to Firebase
const signInToFirebase = async () => {
  if (!isAuthEnabled) {
    return false
  }

  try {
    await signInAnonymously(auth)
    console.log("Signed in anonymously to Firebase")

    // Set up presence system
    setupPresence()

    return true
  } catch (error: any) {
    console.error("Error signing in anonymously:", error)

    // Check for specific error codes
    if (error.code === "auth/admin-restricted-operation") {
      console.warn("Anonymous authentication is disabled for this Firebase project. Operating in local-only mode.")
      isAuthEnabled = false
    }

    return false
  }
}

// Set up presence system to track connected devices
const setupPresence = () => {
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
    }
  })
}

// Get connected devices
export const getConnectedDevices = async () => {
  if (!isAuthEnabled || !database) {
    return []
  }

  try {
    const presenceRef = ref(database, `stores/${storeId}/presence`)
    const snapshot = await get(presenceRef)

    if (snapshot.exists()) {
      const presence = snapshot.val()
      const devices = Object.keys(presence)
        .filter((id) => id !== deviceId && presence[id].online)
        .map((id) => presence[id].deviceId || id)

      return devices
    }

    return []
  } catch (error) {
    console.error("Error getting connected devices:", error)
    return []
  }
}

// Save data to Firebase
export const saveToFirebase = async (data: any) => {
  if (!isAuthEnabled) {
    console.log("Authentication is disabled. Operating in local-only mode.")
    return false
  }

  try {
    const signInSuccess = await signInToFirebase()
    if (!signInSuccess) {
      return false
    }

    await set(ref(database, `stores/${storeId}`), {
      ...data,
      lastUpdated: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error("Error saving data to Firebase:", error)
    return false
  }
}

// Update specific data in Firebase
export const updateFirebaseData = async (path: string, data: any) => {
  if (!isAuthEnabled) {
    console.log("Authentication is disabled. Operating in local-only mode.")
    return false
  }

  try {
    const signInSuccess = await signInToFirebase()
    if (!signInSuccess) {
      return false
    }

    const updates: any = {}
    updates[`stores/${storeId}/${path}`] = data
    updates[`stores/${storeId}/lastUpdated`] = new Date().toISOString()
    await update(ref(database), updates)

    // Broadcast update event to other devices
    const eventRef = ref(database, `stores/${storeId}/events/${Date.now()}`)
    await set(eventRef, {
      type: "update",
      path,
      deviceId,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error(`Error updating ${path} in Firebase:`, error)
    return false
  }
}

// Get data from Firebase
export const getFromFirebase = async () => {
  if (!isAuthEnabled) {
    console.log("Authentication is disabled. Operating in local-only mode.")
    return null
  }

  try {
    const signInSuccess = await signInToFirebase()
    if (!signInSuccess) {
      return null
    }

    const snapshot = await get(ref(database, `stores/${storeId}`))
    if (snapshot.exists()) {
      return snapshot.val()
    } else {
      console.log("No data available in Firebase")
      return null
    }
  } catch (error) {
    console.error("Error getting data from Firebase:", error)
    return null
  }
}

// Subscribe to real-time updates
export const subscribeToFirebase = (callback: (data: any) => void) => {
  let unsubscribed = false

  if (!isAuthEnabled) {
    console.log("Authentication is disabled. Cannot subscribe to Firebase updates.")
    return () => {
      unsubscribed = true
    }
  }

  signInToFirebase().then((success) => {
    if (unsubscribed || !success) return

    const dataRef = ref(database, `stores/${storeId}`)
    onValue(dataRef, (snapshot) => {
      if (unsubscribed) return

      const data = snapshot.val()
      if (data) {
        callback(data)
      }
    })

    // Also listen for events from other devices
    const eventsRef = ref(database, `stores/${storeId}/events`)
    onValue(eventsRef, (snapshot) => {
      if (unsubscribed) return

      const events = snapshot.val()
      if (events) {
        // Process events from other devices
        Object.values(events).forEach((event: any) => {
          if (event.deviceId !== deviceId) {
            console.log(`Received update event from device ${event.deviceId} for path ${event.path}`)
            // The main data will be updated through the dataRef listener above
          }
        })
      }
    })
  })

  // Return unsubscribe function
  return () => {
    unsubscribed = true
    off(ref(database, `stores/${storeId}`))
    off(ref(database, `stores/${storeId}/events`))
  }
}

// Set up a heartbeat to keep connection alive
export const setupHeartbeat = () => {
  if (!isAuthEnabled || !database) return

  // Send heartbeat every 30 seconds
  const interval = setInterval(() => {
    const presenceRef = ref(database, `stores/${storeId}/presence/${deviceId}/lastSeen`)
    set(presenceRef, serverTimestamp()).catch((error) => console.error("Error updating heartbeat:", error))
  }, 30000)

  return () => clearInterval(interval)
}

export default database
