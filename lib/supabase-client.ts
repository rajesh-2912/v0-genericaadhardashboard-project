import { createClient } from "@supabase/supabase-js"
import type { InventoryItem, Transaction, InwardEntry } from "../types/erp-types"

// Create a single supabase client for the entire app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Create client singleton
let supabaseClient: ReturnType<typeof createClient> | null = null

// Get the Supabase client
export const getSupabaseClient = () => {
  try {
    if (!supabaseClient && typeof window !== "undefined") {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase URL or anon key is missing")
        return null
      }
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    }
    return supabaseClient
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    return null
  }
}

// Initialize database tables if they don't exist
export const initializeDatabase = async () => {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    // Check if tables exist
    const { data: tables } = await client.from("inventory").select("id").limit(1)

    // If tables don't exist, create them
    if (!tables || tables.length === 0) {
      console.log("Initializing database tables...")

      // Create inventory table
      await client.rpc("create_inventory_table")

      // Create transactions table
      await client.rpc("create_transactions_table")

      // Create inward entries table
      await client.rpc("create_inward_entries_table")

      return true
    }

    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    return false
  }
}

// Sync inventory data
export const syncInventory = async (inventory: InventoryItem[]) => {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    // First, get the current inventory from Supabase
    const { data: existingInventory, error: fetchError } = await client.from("inventory").select("*")

    if (fetchError) throw fetchError

    // Prepare batch upsert
    const { error } = await client.from("inventory").upsert(
      inventory.map((item) => ({
        id: item.id,
        name: item.name,
        batch: item.batch,
        stock: item.stock,
        expiry: item.expiry,
        purchase_price: item.purchasePrice,
        price: item.price,
        gst_rate: item.gstRate,
        last_updated: new Date().toISOString(),
      })),
    )

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error syncing inventory with Supabase:", error)
    return false
  }
}

// Get inventory data
export const getInventory = async (): Promise<InventoryItem[]> => {
  const client = getSupabaseClient()
  if (!client) {
    console.warn("Supabase client not available, returning empty inventory")
    return []
  }

  try {
    // Check network connectivity first
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("Network is offline, returning empty inventory")
      return []
    }

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

  // Subscribe to changes
  const subscription = client
    .channel("inventory-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, async () => {
      // When a change occurs, fetch the latest data
      const inventory = await getInventory()
      callback(inventory)
    })
    .subscribe()

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe()
  }
}

// Sync transactions data
export const syncTransactions = async (transactions: Transaction[]) => {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    // Prepare batch upsert
    const { error } = await client.from("transactions").upsert(
      transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.date,
        time: transaction.time,
        customer: transaction.customer,
        mobile: transaction.mobile,
        doctor: transaction.doctor,
        payment_method: transaction.paymentMethod,
        items: transaction.items,
        subtotal: transaction.subtotal,
        taxes: transaction.taxes,
        total_tax: transaction.totalTax,
        discount: transaction.discount,
        total: transaction.total,
        last_updated: new Date().toISOString(),
      })),
    )

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error syncing transactions with Supabase:", error)
    return false
  }
}

// Get transactions data
export const getTransactions = async (): Promise<Transaction[]> => {
  const client = getSupabaseClient()
  if (!client) {
    console.warn("Supabase client not available, returning empty transactions")
    return []
  }

  try {
    // Check network connectivity first
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("Network is offline, returning empty transactions")
      return []
    }

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

  // Subscribe to changes
  const subscription = client
    .channel("transaction-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, async () => {
      // When a change occurs, fetch the latest data
      const transactions = await getTransactions()
      callback(transactions)
    })
    .subscribe()

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe()
  }
}

// Sync inward entries data
export const syncInwardEntries = async (inwardEntries: InwardEntry[]) => {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    // Prepare batch upsert
    const { error } = await client.from("inward_entries").upsert(
      inwardEntries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        invoice_no: entry.invoiceNo,
        supplier: entry.supplier,
        payment_status: entry.paymentStatus,
        items: entry.items,
        total_value: entry.totalValue,
        last_updated: new Date().toISOString(),
      })),
    )

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error syncing inward entries with Supabase:", error)
    return false
  }
}

// Get inward entries data
export const getInwardEntries = async (): Promise<InwardEntry[]> => {
  const client = getSupabaseClient()
  if (!client) {
    console.warn("Supabase client not available, returning empty inward entries")
    return []
  }

  try {
    // Check network connectivity first
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("Network is offline, returning empty inward entries")
      return []
    }

    const { data, error } = await client.from("inward_entries").select("*").order("date", { ascending: false })

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

// Subscribe to inward entries changes
export const subscribeToInwardEntries = (callback: (inwardEntries: InwardEntry[]) => void) => {
  const client = getSupabaseClient()
  if (!client) return () => {}

  // Subscribe to changes
  const subscription = client
    .channel("inward-entries-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "inward_entries" }, async () => {
      // When a change occurs, fetch the latest data
      const inwardEntries = await getInwardEntries()
      callback(inwardEntries)
    })
    .subscribe()

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe()
  }
}
