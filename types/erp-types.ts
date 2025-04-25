export type InventoryItem = {
  id: string
  name: string
  batch: string
  stock: number
  expiry: string
  purchasePrice: number
  price: number
  gstRate: number // Added GST rate field
}

export type BillingItem = {
  id: string
  name: string
  batch: string
  quantity: number
  price: number
  total: number
  gstRate: number // Added GST rate field
}

export type Transaction = {
  id: string
  date: string
  time: string
  customer: string
  mobile: string
  doctor?: string
  paymentMethod?: string
  items: BillingItem[]
  subtotal: number
  taxes: {
    rate: number
    amount: number
  }[] // Changed from single tax to array of tax rates and amounts
  totalTax: number // Total tax amount
  discount: number
  total: number
}

export type InwardEntry = {
  id: string
  date: string
  invoiceNo: string
  supplier: string
  items: InventoryItem[]
  paymentStatus: string
  totalValue: number
}

export type ERPData = {
  inventory: InventoryItem[]
  transactions: Transaction[]
  inwardEntries: InwardEntry[]
  lastSyncTime?: string
}

export type SyncStatus = "local" | "syncing" | "synced" | "error" | "offline" | "connected" | "disconnected"
