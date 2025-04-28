"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "@/components/ui/use-toast"
import type { InwardEntry } from "./types/erp-types"
import { shareInvoiceViaWhatsApp } from "./utils/whatsapp-share"
// Update the imports to use the new Supabase hooks
import { useInventorySync, useTransactionsSync, useInwardEntriesSync } from "./hooks/use-supabase-sync"
import SyncStatusIndicator from "./components/sync-status-indicator"
import { Button } from "@/components/ui/button"
import Papa from "papaparse"
import Tesseract from "tesseract.js"
import { EnhancedSyncDialog } from "./components/enhanced-sync-dialog"
import FirebaseConfigDialog from "./components/firebase-config-dialog"
import EnhancedInward from "./components/enhanced-inward"
import SyncStatusPanel from "./components/sync-status-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PlusIcon } from "lucide-react"
import InventoryManagement from "./components/inventory-management"
import ReportsDashboard from "./components/reports-dashboard"
import { v4 as uuidv4 } from "uuid"
import { generateInvoicePDF, openPDF } from "./utils/pdf-generator"

export interface Tax {
  rate: number
  amount: number
}

interface GSTBreakdownProps {
  taxes: Tax[]
}

const GSTBreakdown: React.FC<GSTBreakdownProps> = ({ taxes }) => {
  return (
    <div className="space-y-1">
      {taxes.map((tax, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span>GST ({tax.rate}%):</span>
          <span>₹{tax.amount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export type InventoryItem = {
  id: string
  name: string
  batch: string
  stock: number
  expiry: string
  purchasePrice: number
  price: number
  gstRate: number
}

export type BillingItem = {
  id: string
  name: string
  batch: string
  quantity: number
  price: number
  total: number
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
  taxes: { rate: number; amount: number }[]
  totalTax: number
  discount: number
  total: number
}

export default function GenericAadhaarERP() {
  const date = new Date().toLocaleString()
  const [activeTab, setActiveTab] = useState("home")

  // State for data persistence with Supabase sync
  const [inventory, setInventory, inventorySyncInfo] = useInventorySync([])
  const [transactions, setTransactions, transactionsSyncInfo] = useTransactionsSync([])
  const [inwardEntries, setInwardEntries, inwardEntriesSyncInfo] = useInwardEntriesSync([])

  // Derive overall sync status
  const syncStatus = useMemo(() => {
    if (
      inventorySyncInfo.syncStatus === "syncing" ||
      transactionsSyncInfo.syncStatus === "syncing" ||
      inwardEntriesSyncInfo.syncStatus === "syncing"
    ) {
      return "syncing"
    }
    if (
      inventorySyncInfo.syncStatus === "error" ||
      transactionsSyncInfo.syncStatus === "error" ||
      inwardEntriesSyncInfo.syncStatus === "error"
    ) {
      return "error"
    }
    if (
      inventorySyncInfo.syncStatus === "offline" ||
      transactionsSyncInfo.syncStatus === "offline" ||
      inwardEntriesSyncInfo.syncStatus === "offline"
    ) {
      return "offline"
    }
    if (
      inventorySyncInfo.syncStatus === "loading" ||
      transactionsSyncInfo.syncStatus === "loading" ||
      inwardEntriesSyncInfo.syncStatus === "loading"
    ) {
      return "loading"
    }
    return "synced"
  }, [inventorySyncInfo.syncStatus, transactionsSyncInfo.syncStatus, inwardEntriesSyncInfo.syncStatus])

  // Get last sync time
  const lastSyncTime = useMemo(() => {
    const times = [
      inventorySyncInfo.lastSyncTime,
      transactionsSyncInfo.lastSyncTime,
      inwardEntriesSyncInfo.lastSyncTime,
    ].filter(Boolean) as string[]

    if (times.length === 0) return undefined

    return times.sort().pop()
  }, [inventorySyncInfo.lastSyncTime, transactionsSyncInfo.lastSyncTime, inwardEntriesSyncInfo.lastSyncTime])

  // Force sync all data
  const handleForceSync = async () => {
    // This is a placeholder - in a real app, you would implement this
    return true
  }

  // State for data persistence
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  // Add this state inside the GenericAadhaarERP component
  const [showFirebaseConfigDialog, setShowFirebaseConfigDialog] = useState(false)
  const [deviceId] = useState(() => {
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("ga-device-id")
      if (storedId) return storedId

      const newId = `device-${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem("ga-device-id", newId)
      return newId
    }
    return `device-${Math.random().toString(36).substring(2, 9)}`
  })
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : false)

  // State for inventory management
  const [searchTerm, setSearchTerm] = useState("")
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    batch: "",
    stock: 0,
    expiry: "",
    purchasePrice: 0,
    price: 0,
    gstRate: 5, // Default GST rate of 5%
  })
  const [showAddInventory, setShowAddInventory] = useState(false)

  // State for billing
  const [billingItems, setBillingItems] = useState<BillingItem[]>([])
  const [selectedItem, setSelectedItem] = useState("")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    mobile: "",
    doctor: "",
    paymentMethod: "",
  })
  const [discount, setDiscount] = useState(0)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [currentInvoice, setCurrentInvoice] = useState<Transaction | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [currentInvoicePdfBlob, setCurrentInvoicePdfBlob] = useState<Blob | null>(null)

  // State for inward entries
  const [newInward, setNewInward] = useState<Partial<InwardEntry>>({
    date: new Date().toISOString().split("T")[0],
    invoiceNo: "",
    supplier: "",
    paymentStatus: "",
    items: [],
  })
  const [inwardItems, setInwardItems] = useState<Partial<InventoryItem>[]>([
    {
      name: "",
      batch: "",
      expiry: "",
      stock: 0,
      purchasePrice: 0,
      price: 0,
      gstRate: 5, // Default GST rate of 5%
    },
  ])

  // State for CSV import
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false)
  const [isProcessingCsv, setIsProcessingCsv] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // State for OCR scanning
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResult, setScanResult] = useState<string>("")
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stats for dashboard
  const [stats, setStats] = useState({
    todaySales: 0,
    lowStockCount: 0,
    invoicesGenerated: 0,
  })

  // Handle backup restore event
  useEffect(() => {
    const handleBackupRestore = (event: Event) => {
      const customEvent = event as CustomEvent
      const restoredData = customEvent.detail

      if (restoredData.inventory) {
        setInventory(restoredData.inventory)
      }

      if (restoredData.transactions) {
        setTransactions(restoredData.transactions)
      }

      if (restoredData.inwardEntries) {
        setInwardEntries(restoredData.inwardEntries)
      }

      toast({
        title: "Success",
        description: "Data restored successfully from backup code",
      })
    }

    document.addEventListener("backupRestore", handleBackupRestore)

    return () => {
      document.removeEventListener("backupRestore", handleBackupRestore)
    }
  }, [])

  // Declare the missing export functions
  const exportMostSoldReport = () => {
    try {
      // Create a map to track item sales
      const itemMap = new Map<
        string,
        {
          id: string
          name: string
          totalQuantity: number
          totalRevenue: number
          transactionCount: number
        }
      >()

      // Process all transactions
      transactions.forEach((transaction) => {
        transaction.items.forEach((item) => {
          const existingItem = itemMap.get(item.id)

          if (existingItem) {
            // Update existing item
            itemMap.set(item.id, {
              ...existingItem,
              totalQuantity: existingItem.totalQuantity + item.quantity,
              totalRevenue: existingItem.totalRevenue + item.total,
              transactionCount: existingItem.transactionCount + 1,
            })
          } else {
            // Add new item
            itemMap.set(item.id, {
              id: item.id,
              name: item.name,
              totalQuantity: item.quantity,
              totalRevenue: item.total,
              transactionCount: 1,
            })
          }
        })
      })

      // Convert map to array and sort by quantity
      const mostSoldItems = Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)

      const mostSoldData = mostSoldItems.map((item) => ({
        Name: item.name,
        TotalQuantitySold: item.totalQuantity,
        TotalRevenue: item.totalRevenue.toFixed(2),
        TransactionCount: item.transactionCount,
        AverageQuantityPerTransaction: (item.totalQuantity / item.transactionCount).toFixed(2),
      }))

      // Convert data to CSV
      const csv = Papa.unparse(mostSoldData)

      // Create a blob from the CSV string
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url
      a.download = `most-sold-items-${new Date().toISOString().split("T")[0]}.csv`

      // Trigger a click on the anchor element
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Most sold items report exported successfully",
      })
    } catch (error) {
      console.error("Error exporting most sold items report:", error)
      toast({
        title: "Error",
        description: "Failed to export most sold items report",
        variant: "destructive",
      })
    }
  }

  // Fix the handleShareViaWhatsApp function to properly use the utility functions
  const handleShareViaWhatsApp = async (invoice: Transaction) => {
    try {
      // Generate PDF if not already generated
      if (!currentInvoicePdfBlob) {
        setIsGeneratingPDF(true)
        try {
          const pdfBlob = await generateInvoicePDF(invoice)
          setCurrentInvoicePdfBlob(pdfBlob)

          // Share with WhatsApp
          await shareInvoiceViaWhatsApp(invoice, pdfBlob, invoice.mobile)

          toast({
            title: "Success",
            description: "Invoice shared via WhatsApp",
          })
        } catch (error) {
          console.error("Error generating PDF for WhatsApp:", error)
          toast({
            title: "Error",
            description: "Failed to generate PDF for WhatsApp sharing",
            variant: "destructive",
          })
        } finally {
          setIsGeneratingPDF(false)
        }
      } else {
        // Use existing PDF blob
        await shareInvoiceViaWhatsApp(invoice, currentInvoicePdfBlob, invoice.mobile)

        toast({
          title: "Success",
          description: "Invoice shared via WhatsApp",
        })
      }
    } catch (error) {
      console.error("Error in handleShareViaWhatsApp:", error)
      toast({
        title: "Error",
        description: "Failed to share invoice via WhatsApp",
        variant: "destructive",
      })
    }
  }

  const exportInventoryReport = () => {
    try {
      // Prepare inventory data for export
      const inventoryData = inventory.map((item) => ({
        Name: item.name,
        Batch: item.batch,
        Stock: item.stock,
        ExpiryDate: item.expiry,
        GSTRate: `${item.gstRate}%`,
        PurchasePrice: item.purchasePrice.toFixed(2),
        SellingPrice: item.price.toFixed(2),
        Value: (item.stock * item.price).toFixed(2),
      }))

      // Convert data to CSV
      const csv = Papa.unparse(inventoryData)

      // Create a blob from the CSV string
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url
      a.download = `inventory-report-${new Date().toISOString().split("T")[0]}.csv`

      // Trigger a click on the anchor element
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Inventory report exported successfully",
      })
    } catch (error) {
      console.error("Error exporting inventory report:", error)
      toast({
        title: "Error",
        description: "Failed to export inventory report",
        variant: "destructive",
      })
    }
  }

  const exportSalesReport = () => {
    try {
      // Prepare sales data for export
      const salesData = transactions.map((t) => ({
        Date: t.date,
        Time: t.time,
        Customer: t.customer,
        Mobile: t.mobile,
        Items: t.items.length,
        Subtotal: t.subtotal.toFixed(2),
        TotalTax: t.totalTax.toFixed(2),
        Discount: t.discount.toFixed(2),
        Total: t.total.toFixed(2),
      }))

      // Convert data to CSV
      const csv = Papa.unparse(salesData)

      // Create a blob from the CSV string
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url
      a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`

      // Trigger a click on the anchor element
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Sales report exported successfully",
      })
    } catch (error) {
      console.error("Error exporting sales report:", error)
      toast({
        title: "Error",
        description: "Failed to export sales report",
        variant: "destructive",
      })
    }
  }

  const exportCustomerReport = () => {
    try {
      // Create a map to track customer data
      const customerMap = new Map<
        string,
        {
          name: string
          mobile: string
          totalVisits: number
          totalSpent: number
          lastVisit: string
          averageBill: number
        }
      >()

      // Process all transactions
      transactions.forEach((transaction) => {
        const { customer, mobile, date, total } = transaction

        if (customerMap.has(mobile)) {
          const existingData = customerMap.get(mobile)!

          // Update existing customer data
          customerMap.set(mobile, {
            ...existingData,
            totalVisits: existingData.totalVisits + 1,
            totalSpent: existingData.totalSpent + total,
            lastVisit: date > existingData.lastVisit ? date : existingData.lastVisit,
            averageBill: (existingData.totalSpent + total) / (existingData.totalVisits + 1),
          })
        } else {
          // Add new customer
          customerMap.set(mobile, {
            name: customer,
            mobile,
            totalVisits: 1,
            totalSpent: total,
            lastVisit: date,
            averageBill: total,
          })
        }
      })

      // Convert to array for export
      const customerData = Array.from(customerMap.values()).map((customer) => ({
        Name: customer.name,
        Mobile: customer.mobile,
        TotalVisits: customer.totalVisits,
        TotalSpent: customer.totalSpent.toFixed(2),
        LastVisit: customer.lastVisit,
        AverageBill: customer.averageBill.toFixed(2),
      }))

      // Convert data to CSV
      const csv = Papa.unparse(customerData)

      // Create a blob from the CSV string
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url
      a.download = `customer-report-${new Date().toISOString().split("T")[0]}.csv`

      // Trigger a click on the anchor element
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Customer report exported successfully",
      })
    } catch (error) {
      console.error("Error exporting customer report:", error)
      toast({
        title: "Error",
        description: "Failed to export customer report",
        variant: "destructive",
      })
    }
  }

  // Update online status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Filter inventory items based on search term
  const filteredItems = useMemo(() => {
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [inventory, searchTerm])

  // Calculate billing totals
  const subtotal = useMemo(() => {
    return billingItems.reduce((sum, item) => sum + item.total, 0)
  }, [billingItems])

  const calculateItemizedTaxes = (items: BillingItem[]) => {
    const taxes: { rate: number; amount: number }[] = []

    items.forEach((item) => {
      const taxAmount = (item.total * item.gstRate) / 100

      // Check if we already have an entry for this tax rate
      const existingTaxIndex = taxes.findIndex((tax) => tax.rate === item.gstRate)

      if (existingTaxIndex >= 0) {
        taxes[existingTaxIndex].amount += taxAmount
      } else {
        taxes.push({
          rate: item.gstRate,
          amount: taxAmount,
        })
      }
    })

    return taxes
  }

  // Replace the tax calculation in the component
  const taxes = useMemo(() => {
    return calculateItemizedTaxes(billingItems)
  }, [billingItems])

  const totalTax = useMemo(() => {
    return taxes.reduce((sum, tax) => sum + tax.amount, 0)
  }, [taxes])

  // Replace the total calculation
  const total = useMemo(() => {
    return subtotal + totalTax - discount
  }, [subtotal, totalTax, discount])

  // Update stats whenever relevant data changes
  useEffect(() => {
    // Calculate today's sales
    const today = new Date().toISOString().split("T")[0]
    const todayTransactions = transactions.filter((t) => t.date === today)
    const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0)

    // Count low stock items (less than 10)
    const lowStockCount = inventory.filter((item) => item.stock < 10).length

    // Count today's invoices
    const invoicesGenerated = todayTransactions.length

    setStats({
      todaySales,
      lowStockCount,
      invoicesGenerated,
    })
  }, [transactions, inventory])

  // Handle adding new inventory item
  const handleAddInventoryItem = () => {
    if (!newItem.name || !newItem.batch || !newItem.expiry) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    const item: InventoryItem = {
      id: Date.now().toString(),
      name: newItem.name || "",
      batch: newItem.batch || "",
      stock: newItem.stock || 0,
      expiry: newItem.expiry || "",
      purchasePrice: newItem.purchasePrice || 0,
      price: newItem.price || 0,
      gstRate: newItem.gstRate || 5, // Default to 5% if not specified
    }

    setInventory([...inventory, item])
    setNewItem({
      name: "",
      batch: "",
      stock: 0,
      expiry: "",
      purchasePrice: 0,
      price: 0,
      gstRate: 5,
    })
    setShowAddInventory(false)

    toast({
      title: "Success",
      description: "Inventory item added successfully",
    })
  }

  // Handle adding item to billing
  const handleAddToBilling = () => {
    const item = inventory.find((i) => i.id === selectedItem)
    if (!item) return

    // Check if item already exists in billing
    const existingItemIndex = billingItems.findIndex((i) => i.id === item.id)

    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...billingItems]
      updatedItems[existingItemIndex].quantity += 1
      updatedItems[existingItemIndex].total =
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].price

      setBillingItems(updatedItems)
    } else {
      // Add new item
      const newItem: BillingItem = {
        id: item.id,
        name: item.name,
        batch: item.batch,
        quantity: 1,
        price: item.price,
        total: item.price,
        gstRate: item.gstRate,
      }
      setBillingItems([...billingItems, newItem])
    }
  }

  // Handle removing item from billing
  const handleRemoveFromBilling = (id: string) => {
    const updatedItems = billingItems.filter((item) => item.id !== id)
    setBillingItems(updatedItems)
  }

  // Handle quantity change in billing
  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity < 1) return

    const updatedItems = billingItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          total: quantity * item.price,
        }
      }
      return item
    })

    setBillingItems(updatedItems)
  }

  // Handle discount change
  const handleDiscountChange = (value: number) => {
    setDiscount(value)
  }

  // Handle customer info change
  const handleCustomerInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCustomerInfo({
      ...customerInfo,
      [name]: value,
    })
  }

  // Handle payment method change
  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCustomerInfo({
      ...customerInfo,
      paymentMethod: e.target.value,
    })
  }

  const handleCreateInvoice = () => {
    if (billingItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to billing",
        variant: "destructive",
      })
      return
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
      customer: customerInfo.name || "Guest",
      mobile: customerInfo.mobile || "",
      doctor: customerInfo.doctor || "",
      paymentMethod: customerInfo.paymentMethod || "Cash",
      items: billingItems,
      subtotal,
      taxes,
      totalTax,
      discount,
      total,
    }

    setTransactions([...transactions, newTransaction])
    setCurrentInvoice(newTransaction)
    setShowInvoicePreview(true)
    setBillingItems([])
    setCustomerInfo({
      name: "",
      mobile: "",
      doctor: "",
      paymentMethod: "",
    })
    setDiscount(0)

    toast({
      title: "Success",
      description: "Invoice created successfully",
    })
  }

  // Handle closing invoice preview
  const handleCloseInvoicePreview = () => {
    setShowInvoicePreview(false)
    setCurrentInvoice(null)
    setCurrentInvoicePdfBlob(null)
  }

  // Handle generating PDF
  const handleGeneratePDF = async (invoice: Transaction) => {
    setIsGeneratingPDF(true)
    try {
      const pdfBlob = await generateInvoicePDF(invoice)
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${invoice.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Invoice PDF generated successfully",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Handle adding new inward entry
  const handleAddInwardEntry = () => {
    if (!newInward.invoiceNo || !newInward.supplier || !newInward.paymentStatus) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    const entry: InwardEntry = {
      id: Date.now().toString(),
      date: newInward.date || new Date().toISOString().split("T")[0],
      invoiceNo: newInward.invoiceNo || "",
      supplier: newInward.supplier || "",
      paymentStatus: newInward.paymentStatus || "",
      items: inwardItems.map((item) => ({
        id: Date.now().toString(),
        name: item.name || "",
        batch: item.batch || "",
        expiry: item.expiry || "",
        stock: item.stock || 0,
        purchasePrice: item.purchasePrice || 0,
        price: item.price || 0,
        gstRate: item.gstRate || 5,
      })),
      totalValue: inwardItems.reduce((sum, item) => sum + (item.purchasePrice || 0) * (item.stock || 0), 0),
    }

    setInwardEntries([...inwardEntries, entry])
    setNewInward({
      date: new Date().toISOString().split("T")[0],
      invoiceNo: "",
      supplier: "",
      paymentStatus: "",
      items: [],
    })
    setInwardItems([
      {
        name: "",
        batch: "",
        expiry: "",
        stock: 0,
        purchasePrice: 0,
        price: 0,
        gstRate: 5,
      },
    ])

    toast({
      title: "Success",
      description: "Inward entry added successfully",
    })
  }

  // Handle CSV import
  const handleImportCSV = () => {
    if (!csvInputRef.current?.files?.length) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsProcessingCsv(true)

    const file = csvInputRef.current.files[0]
    const reader = new FileReader()

    reader.onload = (e) => {
      const csv = e.target?.result as string

      Papa.parse(csv, {
        header: true,
        complete: (results) => {
          // Assuming CSV has columns: name, batch, stock, expiry, purchasePrice, price, gstRate
          const importedItems: InventoryItem[] = results.data
            .filter(
              (item: any) =>
                item.name &&
                item.batch &&
                item.stock &&
                item.expiry &&
                item.purchasePrice &&
                item.price &&
                item.gstRate,
            )
            .map((item: any) => ({
              id: Date.now().toString(),
              name: item.name,
              batch: item.batch,
              stock: Number.parseInt(item.stock),
              expiry: item.expiry,
              purchasePrice: Number.parseFloat(item.purchasePrice),
              price: Number.parseFloat(item.price),
              gstRate: Number.parseFloat(item.gstRate),
            }))

          setInventory([...inventory, ...importedItems])
          setIsProcessingCsv(false)
          setShowCsvImportDialog(false)

          toast({
            title: "Success",
            description: "CSV file imported successfully",
          })
        },
        error: (error) => {
          console.error("CSV parsing error:", error)
          setIsProcessingCsv(false)
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          })
        },
      })
    }

    reader.readAsText(file)
  }

  // Handle OCR scanning
  const handleScanImage = () => {
    if (!fileInputRef.current?.files?.length) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)
    setScanProgress(0)
    setScanResult("")

    const file = fileInputRef.current.files[0]
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        Tesseract.recognize(file, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setScanProgress(m.progress * 100)
            }
          },
        })
          .catch((err) => {
            console.error("Tesseract error:", err)
            toast({
              title: "Error",
              description: "Failed to scan image",
              variant: "destructive",
            })
          })
          .then((result) => {
            setIsScanning(false)
            setScanResult(result?.data.text || "")
          })
      }
      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  }

  const handleExportData = () => {
    const dataStr = JSON.stringify({
      inventory,
      transactions,
      inwardEntries,
    })
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = "data.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const handleImportFile = (event: any) => {
    const file = event.target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        if (data.inventory) {
          setInventory(data.inventory)
        }

        if (data.transactions) {
          setTransactions(data.transactions)
        }

        if (data.inwardEntries) {
          setInwardEntries(data.inwardEntries)
        }

        toast({
          title: "Success",
          description: "Data imported successfully from file",
        })
      } catch (error) {
        console.error("Error importing data:", error)
        toast({
          title: "Error",
          description: "Failed to import data from file",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  // Add this function inside the GenericAadhaarERP component
  const handleConfigureFirebase = () => {
    setShowFirebaseConfigDialog(true)
  }

  // Use Supabase sync hooks

  // Billing form state
  const [billingForm, setBillingForm] = useState({
    customer: "",
    mobile: "",
    doctor: "",
    paymentMethod: "Cash",
    items: [] as any[],
    searchTerm: "",
    selectedItem: null as any,
    quantity: 1,
    discount: 0,
  })

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBillingForm((prev) => ({ ...prev, [name]: value }))
  }

  // Search inventory
  const searchInventory = () => {
    if (!billingForm.searchTerm) return

    const foundItem = inventory.find(
      (item) => item.name.toLowerCase().includes(billingForm.searchTerm.toLowerCase()) && item.stock > 0,
    )

    if (foundItem) {
      setBillingForm((prev) => ({
        ...prev,
        selectedItem: foundItem,
        quantity: 1,
      }))
    } else {
      alert("Item not found or out of stock")
    }
  }

  // Add item to bill
  const addItemToBill = () => {
    if (!billingForm.selectedItem) return

    const { selectedItem, quantity } = billingForm

    // Calculate item total with GST
    const price = selectedItem.price
    const gstRate = selectedItem.gstRate
    const itemTotal = price * quantity

    const newItem = {
      id: selectedItem.id,
      name: selectedItem.name,
      batch: selectedItem.batch,
      price: price,
      gstRate: gstRate,
      quantity: quantity,
      total: itemTotal,
    }

    setBillingForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      searchTerm: "",
      selectedItem: null,
      quantity: 1,
    }))
  }

  // Remove item from bill
  const removeItemFromBill = (index: number) => {
    setBillingForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  // Calculate bill totals
  const calculateBillTotals = () => {
    const { items, discount } = billingForm

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)

    // Group items by GST rate
    const gstGroups = items.reduce((groups: any, item) => {
      const rate = item.gstRate
      if (!groups[rate]) {
        groups[rate] = {
          rate,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0,
        }
      }

      // Calculate taxable amount (price without GST)
      const taxableAmount = (item.price * item.quantity) / (1 + rate / 100)
      const tax = item.price * item.quantity - taxableAmount

      groups[rate].taxableAmount += taxableAmount
      groups[rate].cgst += tax / 2
      groups[rate].sgst += tax / 2
      groups[rate].totalTax += tax

      return groups
    }, {})

    // Convert to array
    const taxes = Object.values(gstGroups)

    // Calculate total tax
    const totalTax = taxes.reduce((sum: number, tax: any) => sum + tax.totalTax, 0)

    // Calculate grand total
    const total = subtotal - discount

    return {
      subtotal,
      taxes,
      totalTax,
      discount: Number.parseFloat(discount.toString()) || 0,
      total,
    }
  }

  // Generate and submit invoice
  const submitInvoice = () => {
    const { customer, mobile, doctor, paymentMethod, items } = billingForm

    if (!customer || !mobile || items.length === 0) {
      alert("Please fill in all required fields and add at least one item")
      return
    }

    // Calculate totals
    const { subtotal, taxes, totalTax, discount, total } = calculateBillTotals()

    // Create transaction object
    const transaction = {
      id: uuidv4(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
      customer,
      mobile,
      doctor,
      paymentMethod,
      items,
      subtotal,
      taxes,
      totalTax,
      discount,
      total,
    }

    // Update transactions
    setTransactions([transaction, ...transactions])

    // Update inventory (reduce stock)
    const updatedInventory = [...inventory]

    for (const item of items) {
      const inventoryItemIndex = updatedInventory.findIndex((invItem) => invItem.id === item.id)

      if (inventoryItemIndex >= 0) {
        updatedInventory[inventoryItemIndex] = {
          ...updatedInventory[inventoryItemIndex],
          stock: updatedInventory[inventoryItemIndex].stock - item.quantity,
        }
      }
    }

    setInventory(updatedInventory)

    // Generate and open PDF
    const doc = generateInvoicePDF(transaction)
    openPDF(doc)

    // Reset form
    setBillingForm({
      customer: "",
      mobile: "",
      doctor: "",
      paymentMethod: "Cash",
      items: [],
      searchTerm: "",
      selectedItem: null,
      quantity: 1,
      discount: 0,
    })
  }

  // Get today's sales total
  const getTodaySales = () => {
    const today = new Date().toISOString().split("T")[0]
    return transactions
      .filter((transaction) => transaction.date === today)
      .reduce((sum, transaction) => sum + transaction.total, 0)
  }

  // Get low stock items count
  const getLowStockCount = () => {
    return inventory.filter((item) => item.stock <= 10).length
  }

  // Get today's invoice count
  const getTodayInvoiceCount = () => {
    const today = new Date().toISOString().split("T")[0]
    return transactions.filter((transaction) => transaction.date === today).length
  }

  return (
    <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-100 min-h-screen text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">🧬 Generic Aadhaar - Pharmacy ERP</h1>
        <div className="flex items-center gap-2">
          <SyncStatusIndicator
            status={syncStatus}
            lastSyncTime={lastSyncTime}
            isOnline={inventorySyncInfo.isOnline}
            connectedDevices={[]}
            onSync={handleForceSync}
            hasValidApiKey={true}
            onConfigureFirebase={handleConfigureFirebase}
          />
          <Button variant="ghost" size="sm" onClick={() => setShowSyncDialog(true)}>
            Sync
          </Button>
          <span className="text-sm text-gray-600">{date}</span>
        </div>
      </header>

      {/* Rest of your component JSX */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="home">🏠 Home</TabsTrigger>
          <TabsTrigger value="billing">🧾 Billing</TabsTrigger>
          <TabsTrigger value="inventory">📦 Inventory</TabsTrigger>
          <TabsTrigger value="inward">📤 Inward</TabsTrigger>
          <TabsTrigger value="reports">📊 Reports</TabsTrigger>
          <TabsTrigger value="sync">🔄 Sync</TabsTrigger>
        </TabsList>

        {/* Home */}
        <TabsContent value="home">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-blue-50 to-blue-100">
                <span className="text-blue-500 text-lg font-semibold">Today's Sales</span>
                <span className="text-2xl font-bold mt-2">₹{getTodaySales().toFixed(2)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-amber-50 to-amber-100">
                <span className="text-amber-500 text-lg font-semibold">Low Stock Alerts</span>
                <span className="text-2xl font-bold mt-2">{getLowStockCount()}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-green-50 to-green-100">
                <span className="text-green-500 text-lg font-semibold">Invoices Generated</span>
                <span className="text-2xl font-bold mt-2">{getTodayInvoiceCount()}</span>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 text-center italic text-lg text-blue-700">"Great service begins with great health."</div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Customer Name"
                name="customer"
                value={billingForm.customer}
                onChange={handleInputChange}
              />
              <Input
                placeholder="Mobile Number"
                name="mobile"
                value={billingForm.mobile}
                onChange={handleInputChange}
              />
              <Input
                placeholder="Doctor Name (Optional)"
                name="doctor"
                value={billingForm.doctor}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search Medicine..."
                  name="searchTerm"
                  value={billingForm.searchTerm}
                  onChange={handleInputChange}
                />
                <Button onClick={searchInventory}>Search</Button>
              </div>
              <Input
                type="number"
                placeholder="Quantity"
                name="quantity"
                value={billingForm.quantity}
                onChange={handleInputChange}
                disabled={!billingForm.selectedItem}
                min="1"
              />
              <Button
                onClick={addItemToBill}
                disabled={!billingForm.selectedItem}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            {billingForm.selectedItem && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Selected Item:</span>
                      <p>{billingForm.selectedItem.name}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Batch:</span>
                      <p>{billingForm.selectedItem.batch}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Price:</span>
                      <p>₹{billingForm.selectedItem.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Available Stock:</span>
                      <p>{billingForm.selectedItem.stock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Invoice Items</h3>
                {billingForm.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No items added to invoice yet</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Item</th>
                          <th className="p-2 text-left">Batch</th>
                          <th className="p-2 text-right">Price</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">GST</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingForm.items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2">{item.batch}</td>
                            <td className="p-2 text-right">₹{item.price.toFixed(2)}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{item.gstRate}%</td>
                            <td className="p-2 text-right">₹{item.total.toFixed(2)}</td>
                            <td className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromBill(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {billingForm.items.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">GST Breakdown</h4>
                      <div className="border rounded-md p-2 bg-gray-50">
                        {calculateBillTotals().taxes.map((tax: any, index: number) => (
                          <div key={index} className="grid grid-cols-4 text-sm mb-1">
                            <div>{tax.rate}% GST:</div>
                            <div>₹{tax.taxableAmount.toFixed(2)}</div>
                            <div>CGST: ₹{tax.cgst.toFixed(2)}</div>
                            <div>SGST: ₹{tax.sgst.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Invoice Summary</h4>
                      <div className="border rounded-md p-2 bg-gray-50">
                        <div className="flex justify-between mb-1">
                          <span>Subtotal:</span>
                          <span>₹{calculateBillTotals().subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Total Tax:</span>
                          <span>₹{calculateBillTotals().totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Discount:</span>
                          <div className="flex items-center">
                            <span>₹</span>
                            <Input
                              type="number"
                              name="discount"
                              value={billingForm.discount}
                              onChange={handleInputChange}
                              className="w-20 h-6 ml-1"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                          <span>Grand Total:</span>
                          <span>₹{calculateBillTotals().total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={submitInvoice}
                disabled={billingForm.items.length === 0}
              >
                Generate Invoice
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <InventoryManagement />
        </TabsContent>

        {/* Inward */}
        <TabsContent value="inward">
          <EnhancedInward
            onSave={(entry) => {
              // Add the new inward entry
              setInwardEntries([...inwardEntries, entry])

              // Update inventory with the new items
              const updatedInventory = [...inventory]

              entry.items.forEach((inwardItem) => {
                // Check if item already exists in inventory
                const existingItemIndex = updatedInventory.findIndex((item) => item.batch === inwardItem.batch)

                if (existingItemIndex >= 0) {
                  // Update existing item
                  updatedInventory[existingItemIndex] = {
                    ...updatedInventory[existingItemIndex],
                    stock: (updatedInventory[existingItemIndex].stock || 0) + (inwardItem.stock || 0),
                    // Update other properties if needed
                    purchasePrice: inwardItem.purchasePrice,
                    price: inwardItem.price,
                    expiry: inwardItem.expiry,
                  }
                } else {
                  // Add new item
                  updatedInventory.push({
                    ...inwardItem,
                    id: inwardItem.id || Date.now().toString(),
                  })
                }
              })

              setInventory(updatedInventory)

              toast({
                title: "Inward Entry Added",
                description: `Added ${entry.items.length} items to inventory`,
              })
            }}
            existingInventory={inventory}
          />
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <ReportsDashboard />
        </TabsContent>

        {/* Sync - New Tab for Multi-Device Sync */}
        <TabsContent value="sync">
          <SyncStatusPanel
            syncStatus={syncStatus}
            lastSyncTime={lastSyncTime}
            isOnline={inventorySyncInfo.isOnline}
            connectedDevices={[]}
            deviceId={deviceId}
            onSync={handleForceSync}
            hasValidApiKey={true}
            onConfigureFirebase={handleConfigureFirebase}
          />
        </TabsContent>
      </Tabs>

      {/* Enhanced sync dialog */}
      <EnhancedSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        deviceId={deviceId}
        syncStatus={syncStatus}
        isOnline={inventorySyncInfo.isOnline}
        lastSyncTime={lastSyncTime}
        onSync={handleForceSync}
        onExport={handleExportData}
        onImport={handleImportFile}
        data={{
          inventory,
          transactions,
          inwardEntries,
        }}
        connectedDevices={[]}
      />
      {/* Add this JSX right before the closing </div> at the end of the component */}
      <FirebaseConfigDialog open={showFirebaseConfigDialog} onOpenChange={setShowFirebaseConfigDialog} />
    </div>
  )
}
