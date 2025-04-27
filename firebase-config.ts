// Firebase configuration for real-time database
import { initializeApp, getApp } from "firebase/app"
import { getDatabase, ref, set, onValue, off, update, get } from "firebase/database"
import { getAuth, signInAnonymously } from "firebase/auth"

// Check if Firebase is already initialized to prevent duplicate initializations
let app: any
let database: any
let auth: any

// Check if we're in the browser environment
const isBrowser = typeof window !== "undefined"

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

  // Only initialize Firebase in the browser
  if (isBrowser) {
    app = initializeApp(firebaseConfig)
    database = getDatabase(app)
    auth = getAuth(app)
  }
}

// Generate a unique store ID or retrieve from localStorage
const getStoreId = () => {
  // Only access localStorage in the browser
  if (!isBrowser) return "default_store_id"

  let storeId = localStorage.getItem("ga-store-id")
  if (!storeId) {
    storeId = "store_" + Math.random().toString(36).substring(2, 15)
    localStorage.setItem("ga-store-id", storeId)
  }
  return storeId
}

// Store ID for this installation
const storeId = getStoreId()

// Sign in anonymously to Firebase
const signInToFirebase = async () => {
  // Only attempt to sign in if in browser and auth is available
  if (!isBrowser || !auth) return false

  try {
    await signInAnonymously(auth)
    console.log("Signed in anonymously to Firebase")
    return true
  } catch (error) {
    console.error("Error signing in anonymously:", error)
    return false
  }
}

// Save data to Firebase
export const saveToFirebase = async (data: any) => {
  // Only attempt to save if in browser and database is available
  if (!isBrowser || !database) return false

  try {
    await signInToFirebase()
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
  // Only attempt to update if in browser and database is available
  if (!isBrowser || !database) return false

  try {
    await signInToFirebase()
    const updates: any = {}
    updates[`stores/${storeId}/${path}`] = data
    updates[`stores/${storeId}/lastUpdated`] = new Date().toISOString()
    await update(ref(database), updates)
    return true
  } catch (error) {
    console.error(`Error updating ${path} in Firebase:`, error)
    return false
  }
}

// Get data from Firebase
export const getFromFirebase = async () => {
  // Only attempt to get data if in browser and database is available
  if (!isBrowser || !database) return null

  try {
    await signInToFirebase()
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
  // Only attempt to subscribe if in browser and database is available
  if (!isBrowser || !database) {
    return () => {} // Return empty unsubscribe function
  }

  let unsubscribed = false

  signInToFirebase().then(() => {
    if (unsubscribed) return

    const dataRef = ref(database, `stores/${storeId}`)
    onValue(dataRef, (snapshot) => {
      if (unsubscribed) return

      const data = snapshot.val()
      if (data) {
        callback(data)
      }
    })
  })

  // Return unsubscribe function
  return () => {
    unsubscribed = true
    if (database) {
      off(ref(database, `stores/${storeId}`))
    }
  }
}

export default database
