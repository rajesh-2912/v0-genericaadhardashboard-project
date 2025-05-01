"use client"

import { createClient } from "@supabase/supabase-js"
import type { InventoryItem, Transaction, InwardEntry } from "../types/erp-types"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let supabaseClient: ReturnType<typeof createClient> | null = null

// Check if network is available
const isNetworkAvailable = () => {
  return typeof navigator !== "undefined" && navigator.onLine
}

// Get the Supabase client
export const getSupabaseClient = () => {
  try {
    if (!supabaseClient && typeof window !== "undefined") {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase URL or anon key is missing")
        return null
      }

      // Only create client if we have credentials
      if (supabaseUrl.length > 0 && supabaseAnonKey.length > 0) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
      } else {
        console.warn("Invalid Supabase credentials")
        return null
      }
    }
    return supabaseClient
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    return null
  }
}

// Initialize database tables if they don't exist
export const initializeDatabase = async () => {
  // Check network connectivity first
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, skipping database initialization")
    return false
  }

  const client = getSupabaseClient()
  if (!client) return false

  try {
    // Check if tables exist
    const { data: tables, error } = await client.from("inventory").select("id").limit(1)

    if (error) {
      console.error("Error checking if tables exist:", error)
      return false
    }

    // If tables don't exist, create them
    if (!tables || tables.length === 0) {
      console.log("Initializing database tables...")

      try {
        // Create inventory table
        await client.rpc("create_inventory_table")

        // Create transactions table
        await client.rpc("create_transactions_table")

        // Create inward entries table
        await client.rpc("create_inward_entries_table")

        return true
      } catch (createError) {
        console.error("Error creating database tables:", createError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    return false
  }
}

// Mock functions for Supabase operations
export const syncInventory = async (data: InventoryItem[]) => {
  console.log("Syncing inventory to Supabase...", data.length)
  return true
}

export const syncTransactions = async (data: Transaction[]) => {
  console.log("Syncing transactions to Supabase...", data.length)
  return true
}

export const syncInwardEntries = async (data: InwardEntry[]) => {
  console.log("Syncing inward entries to Supabase...", data.length)
  return true
}

// Get inventory data
export const getInventory = async (): Promise<InventoryItem[]> => {
  // Check network connectivity first
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, returning empty inventory")
    return []
  }

  const client = getSupabaseClient()
  if (!client) {
    console.warn("Supabase client not available, returning empty inventory")
    return []
  }

  try {
    const { data, error } = await client.from("inventory").select("*").order("name")

    if (error) {
      console.error("Supabase error fetching inventory:", error)
      return []
    }

    if (!data) {
      console.warn("No inventory data returned from Supabase")
      return []
    }

    // Convert from Supabase format to app format
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      batch: item.batch,
      stock: item.stock,
      expiry: item.expiry,
      purchasePrice: item.purchase_price,
      price: item.price,
      gstRate: item.gst_rate,
    }))
  } catch (error) {
    console.error("Error getting inventory from Supabase:", error)
    // Return empty array instead of throwing
    return []
  }
}

// Subscribe to inventory changes
export const subscribeToInventory = (callback: (inventory: InventoryItem[]) => void) => {
  const client = getSupabaseClient()
  if (!client) return () => {}

  // Only subscribe if network is available
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, skipping inventory subscription")
    return () => {}
  }

  try {
    // Subscribe to changes
    const subscription = client
      .channel("inventory-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, async () => {
        try {
          // When a change occurs, fetch the latest data
          const inventory = await getInventory()
          callback(inventory)
        } catch (error) {
          console.error("Error in inventory subscription callback:", error)
        }
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn(`Inventory subscription status: ${status}`)
        }
      })

    // Return unsubscribe function
    return () => {
      try {
        subscription.unsubscribe()
      } catch (error) {
        console.error("Error unsubscribing from inventory changes:", error)
      }
    }
  } catch (error) {
    console.error("Error subscribing to inventory changes:", error)
    return () => {}
  }
}

// Get transactions data
export const getTransactions = async (): Promise<Transaction[]> => {
  // Check network connectivity first
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, returning empty transactions")
    return []
  }

  const client = getSupabaseClient()
  if (!client) {
    console.warn("Supabase client not available, returning empty transactions")
    return []
  }

  try {
    const { data, error } = await client.from("transactions").select("*").order("date", { ascending: false })

    if (error) {
      console.error("Supabase error fetching transactions:", error)
      return []
    }

    if (!data) {
      console.warn("No transactions data returned from Supabase")
      return []
    }

    // Convert from Supabase format to app format
    return data.map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      time: transaction.time,
      customer: transaction.customer,
      mobile: transaction.mobile,
      doctor: transaction.doctor || "",
      paymentMethod: transaction.payment_method || "",
      items: transaction.items,
      subtotal: transaction.subtotal,
      taxes: transaction.taxes,
      totalTax: transaction.total_tax,
      discount: transaction.discount,
      total: transaction.total,
    }))
  } catch (error) {
    console.error("Error getting transactions from Supabase:", error)
    // Return empty array instead of throwing
    return []
  }
}

// Subscribe to transactions changes
export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void) => {
  const client = getSupabaseClient()
  if (!client) return () => {}

  // Only subscribe if network is available
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, skipping transactions subscription")
    return () => {}
  }

  try {
    // Subscribe to changes
    const subscription = client
      .channel("transaction-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, async () => {
        try {
          // When a change occurs, fetch the latest data
          const transactions = await getTransactions()
          callback(transactions)
        } catch (error) {
          console.error("Error in transactions subscription callback:", error)
        }
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn(`Transactions subscription status: ${status}`)
        }
      })

    // Return unsubscribe function
    return () => {
      try {
        subscription.unsubscribe()
      } catch (error) {
        console.error("Error unsubscribing from transaction changes:", error)
      }
    }
  } catch (error) {
    console.error("Error subscribing to transaction changes:", error)
    return () => {}
  }
}

// Get inward entries data with improved error handling
export const getInwardEntries = async (): Promise<InwardEntry[]> => {
  // Check network connectivity first
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, returning empty inward entries")
    return []
  }

  const client = getSupabaseClient()
  if (!client) {
    console.warn("Supabase client not available, returning empty inward entries")
    return []
  }

  try {
    // Use a timeout to prevent hanging requests
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 10000),
    )

    // Actual request
    const requestPromise = client.from("inward_entries").select("*").order("date", { ascending: false })

    // Race between timeout and actual request
    const { data, error } = await Promise.race([requestPromise, timeoutPromise])

    if (error) {
      console.error("Supabase error fetching inward entries:", error)
      return []
    }

    if (!data) {
      console.warn("No inward entries data returned from Supabase")
      return []
    }

    // Convert from Supabase format to app format
    return data.map((entry) => ({
      id: entry.id,
      date: entry.date,
      invoiceNo: entry.invoice_no,
      supplier: entry.supplier,
      paymentStatus: entry.payment_status,
      items: entry.items,
      totalValue: entry.total_value,
    }))
  } catch (error) {
    console.error("Error getting inward entries from Supabase:", error)
    // Return empty array instead of throwing
    return []
  }
}

// Subscribe to inward entries changes with improved error handling
export const subscribeToInwardEntries = (callback: (inwardEntries: InwardEntry[]) => void) => {
  const client = getSupabaseClient()
  if (!client) return () => {}

  // Only subscribe if network is available
  if (!isNetworkAvailable()) {
    console.warn("Network is offline, skipping inward entries subscription")
    return () => {}
  }

  try {
    // Subscribe to changes
    const subscription = client
      .channel("inward-entries-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inward_entries" }, async () => {
        try {
          // When a change occurs, fetch the latest data
          const inwardEntries = await getInwardEntries()
          callback(inwardEntries)
        } catch (error) {
          console.error("Error in inward entries subscription callback:", error)
        }
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn(`Inward entries subscription status: ${status}`)
        }
      })

    // Return unsubscribe function
    return () => {
      try {
        subscription.unsubscribe()
      } catch (error) {
        console.error("Error unsubscribing from inward entries changes:", error)
      }
    }
  } catch (error) {
    console.error("Error subscribing to inward entries changes:", error)
    return () => {}
  }
}
