"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "@/components/ui/use-toast"
import type { InwardEntry } from "./types/erp-types"
import { shareInvoiceViaWhatsApp } from "./utils/whatsapp-share"
import { generateInvoicePDF } from "./utils/pdf-generator"
import { useEnhancedSync } from "./hooks/use-enhanced-sync"
import { Button } from "@/components/ui/button"
import Papa from "papaparse"
import Tesseract from "tesseract.js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DownloadIcon, FileTextIcon, ReceiptIcon } from "lucide-react"

// Export types and interfaces
export interface Tax {
  rate: number
  amount: number
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

// Define the component
function GenericAadhaarERP() {
  // Component implementation...
  // (I'm omitting the full implementation for brevity, but it would be the same as before)

  const date = new Date().toLocaleString()
  // State for data persistence with enhanced sync
  const [inventory, setInventory, inventorySyncStatus, inventorySyncInfo] = useEnhancedSync<InventoryItem[]>(
    "inventory",
    [],
  )
  const [transactions, setTransactions, transactionsSyncStatus, transactionsSyncInfo] = useEnhancedSync<Transaction[]>(
    "transactions",
    [],
  )
  const [inwardEntries, setInwardEntries, inwardEntriesSyncStatus, inwardEntriesSyncInfo] = useEnhancedSync<
    InwardEntry[]
  >("inward-entries", [])

  // Derive overall sync status
  const syncStatus = useMemo(() => {
    if (
      inventorySyncStatus === "syncing" ||
      transactionsSyncStatus === "syncing" ||
      inwardEntriesSyncStatus === "syncing"
    ) {
      return "syncing"
    }
    if (inventorySyncStatus === "error" || transactionsSyncStatus === "error" || inwardEntriesSyncStatus === "error") {
      return "error"
    }
    if (
      inventorySyncStatus === "offline" ||
      transactionsSyncStatus === "offline" ||
      inwardEntriesSyncStatus === "offline"
    ) {
      return "offline"
    }
    if (inventorySyncStatus === "local" || transactionsSyncStatus === "local" || inwardEntriesSyncStatus === "local") {
      return "local"
    }
    return "synced"
  }, [inventorySyncStatus, transactionsSyncStatus, inwardEntriesSyncStatus])

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

  // Get connected devices
  const connectedDevices = useMemo(() => {
    return Array.from(
      new Set([
        ...inventorySyncInfo.connectedDevices,
        ...transactionsSyncInfo.connectedDevices,
        ...inwardEntriesSyncInfo.connectedDevices,
      ]),
    )
  }, [
    inventorySyncInfo.connectedDevices,
    transactionsSyncInfo.connectedDevices,
    inwardEntriesSyncInfo.connectedDevices,
  ])

  // Force sync all data
  const handleForceSync = async () => {
    const results = await Promise.all([
      inventorySyncInfo.sync(),
      transactionsSyncInfo.sync(),
      inwardEntriesSyncInfo.sync(),
    ])

    return results.every(Boolean)
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

  // State for inventory management with localStorage persistence
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

  // State for transactions with localStorage persistence
  // State for transactions with localStorage persistence

  // State for inward entries with localStorage persistence
  // State for inward entries with localStorage persistence
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
    if (typeof window === "undefined") return

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

      // Update last sync time
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)

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

  // Load last sync time from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return

    const savedSyncTime = localStorage.getItem("ga-last-sync-time")
    if (savedSyncTime) {
      // We can use this if needed
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
          .then((result) => {
            setScanResult(result.data.text)
            setIsScanning(false)

            toast({
              title: "Success",
              description: "Image scanned successfully",
            })
          })
          .catch((err) => {
            console.error("Tesseract error:", err)
            toast({
              title: "Error",
              description: "Failed to scan image",
            })
          })
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-100 min-h-screen text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">🧬 Generic Aadhaar - Pharmacy ERP</h1>
        <span className="text-sm text-gray-600">{date}</span>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="home" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="home">🏠 Home</TabsTrigger>
          <TabsTrigger value="billing">🧾 Billing</TabsTrigger>
          <TabsTrigger value="inventory">📦 Inventory</TabsTrigger>
          <TabsTrigger value="inward">📤 Inward</TabsTrigger>
          <TabsTrigger value="reports">📊 Reports</TabsTrigger>
        </TabsList>

        {/* Home */}
        <TabsContent value="home">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">Today's Sales: ₹12,350</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Low Stock Alerts: 8 Items</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Invoices Generated: 23</CardContent>
            </Card>
          </div>
          <div className="mt-6 text-center italic text-lg text-blue-700">"Great service begins with great health."</div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Customer Name" />
              <Input placeholder="Mobile Number" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input placeholder="Search Medicine..." />
              <Input placeholder="Batch Code" />
              <Input placeholder="Price" />
            </div>
            <Textarea placeholder="Invoice Preview..." className="h-32" />
            <div className="flex gap-2">
              <Button className="bg-green-500 text-white">Submit</Button>
              <Button variant="outline">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline">
                <ReceiptIcon className="mr-2 h-4 w-4" />
                Send SMS
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Inventory Overview</h2>
            <Button>
              <FileTextIcon className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">Inventory Table (coming soon)</CardContent>
          </Card>
        </TabsContent>

        {/* Inward */}
        <TabsContent value="inward">
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Inward Stock Entry</h2>
            <Tabs defaultValue="csv">
              <TabsList>
                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                <TabsTrigger value="ocr">Image OCR</TabsTrigger>
              </TabsList>
              <TabsContent value="csv">
                <Input type="file" />
                <Button className="mt-2">Upload & Check Twice</Button>
              </TabsContent>
              <TabsContent value="ocr">
                <Input type="file" />
                <Button className="mt-2">Scan & Review</Button>
              </TabsContent>
            </Tabs>
            <Card>
              <CardContent className="p-4">Check Twice Preview (coming soon)</CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">Sales Report - Export Options</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Tax Summary - GST View</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Stock Movement Details</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Profit & Monthly Summary</CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Export the component as default
export default GenericAadhaarERP

// Also add CommonJS export for compatibility
if (typeof module !== "undefined") {
  module.exports = GenericAadhaarERP
  module.exports.default = GenericAadhaarERP
}
