export interface InventoryItem {
  id: string
  name: string
  batch: string
  expiry: string
  stock: number
  purchasePrice: number
  price: number
  gstRate: number
}

export interface TransactionItem {
  id: string
  name: string
  batch: string
  expiry: string
  mrp: number
  price: number
  quantity: number
  gstRate: number
}

export interface TaxBreakdown {
  rate: number
  amount: number
}

export interface Transaction {
  id: string
  customer: string
  mobile: string
  doctor?: string
  date: string
  time: string
  items: TransactionItem[]
  subtotal: number
  discount: number
  totalTax: number
  taxes?: TaxBreakdown[]
  total: number
  paymentMethod?: string
  referral?: {
    name: string
    amount: number
  }
}

export interface InwardEntry {
  id: string
  date: string
  invoiceNo: string
  supplier: string
  paymentStatus: string
  items: InwardItem[]
  totalValue: number
}

export interface InwardItem {
  name: string
  batch: string
  expiry: string
  quantity: number
  purchasePrice: number
  price: number
  gstRate: number
}

export interface SyncInfo {
  isOnline: boolean
  syncStatus: SyncStatus
  lastSyncTime?: string
  error?: string
}

export type SyncStatus =
  | "loading"
  | "synced"
  | "syncing"
  | "error"
  | "offline"
  | "local"
  | "no-api-key"
  | "auth-disabled"
  | "connected"
  | "disconnected"

export type UserRole = "admin" | "pharmacist" | "cashier"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  otp?: string
  otpExpiry?: Date
}

export interface ReferralCode {
  id: string
  code: string
  discount: number
  usageLimit: number
  usageCount: number
  expiryDate: string
  createdBy: string
}

export interface BillingItem {
  id: string
  name: string
  batch: string
  quantity: number
  price: number
  gstRate: number
  total: number
  expiry: string
  mrp: number
}
