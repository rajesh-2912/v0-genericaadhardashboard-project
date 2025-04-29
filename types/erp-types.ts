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

export type TransactionItem = {
  name: string
  batch: string
  expiry: string
  mrp: number
  price: number
  quantity: number
  gstRate: number
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
    taxableAmount: number
    cgst: number
    sgst: number
    totalTax: number
  }[] // Changed from single tax to array of tax rates and amounts
  totalTax: number // Total tax amount
  discount: number
  total: number
}

export type InwardItem = {
  name: string
  batch: string
  expiry: string
  quantity: number
  purchasePrice: number
  price: number
  gstRate: number
}

export type InwardEntry = {
  id: string
  date: string
  invoiceNo: string
  supplier: string
  items: InwardItem[]
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
