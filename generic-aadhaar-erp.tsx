"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "@/components/ui/use-toast"
import { useLocalStorage } from "./hooks/use-local-storage"
import type { InwardEntry, SyncStatus } from "./types/erp-types"
import { shareInvoiceViaWhatsApp } from "./utils/whatsapp-share"
import { generateInvoicePDF } from "./utils/pdf-generator"
import Papa from "papaparse"

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

  // State for data persistence
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local")
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined)
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
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>("ga-inventory", [])
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
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("ga-transactions", [])

  // State for inward entries with localStorage persistence
  const [inwardEntries, setInwardEntries] = useLocalStorage<InwardEntry[]>("ga-inward-entries", [])
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

      // Update last sync time
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)
      setLastSyncTime(currentTime)

      setSyncStatus("synced")

      toast({
        title: "Success",
        description: "Data restored successfully from backup code",
      })
    }

    document.addEventListener("backupRestore", handleBackupRestore)

    return () => {
      document.removeEventListener("backupRestore", handleBackupRestore)
    }
  }, [setInventory, setTransactions, setInwardEntries])

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
      setSyncStatus((prev) => (prev === "offline" ? "local" : prev))
      toast({
        title: "You are online",
        description: "Data will now sync automatically",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus("offline")
      toast({
        title: "You are offline",
        description: "Changes will be saved locally until you reconnect",
        variant: "destructive",
      })
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
      setLastSyncTime(savedSyncTime)
      setSyncStatus("synced")
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
    setSyncStatus("local")

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
      // Add new item to billing
      const newBillingItem: BillingItem = {
        id: item.id,
        name: item.name,
        batch: item.batch,
        quantity: 1,
        price: item.price,
        total: item.price,
        gstRate: item.gstRate, // Include the GST rate
      }
      setBillingItems([...billingItems, newBillingItem])
    }

    setSelectedItem("")
  }

  // Handle updating billing item quantity
  const handleUpdateQuantity = (id: string, quantity: number) => {
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

  // Handle removing item from billing
  const handleRemoveFromBilling = (id: string) => {
    setBillingItems(billingItems.filter((item) => item.id !== id))
  }

  // Handle generating invoice
  const handleGenerateInvoice = () => {
    if (billingItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to the invoice",
        variant: "destructive",
      })
      return
    }

    if (!customerInfo.name || !customerInfo.mobile) {
      toast({
        title: "Error",
        description: "Please enter customer name and mobile number",
        variant: "destructive",
      })
      return
    }

    // Create new transaction with itemized taxes
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
      customer: customerInfo.name,
      mobile: customerInfo.mobile,
      doctor: customerInfo.doctor,
      paymentMethod: customerInfo.paymentMethod,
      items: [...billingItems],
      subtotal,
      taxes, // Use the itemized taxes
      totalTax, // Total tax amount
      discount,
      total,
    }

    // Set current invoice for preview
    setCurrentInvoice(newTransaction)
    setShowInvoicePreview(true)

    // Generate PDF for sharing
    generateInvoicePDFBlob(newTransaction)
  }

  // Handle saving invoice after preview
  const handleSaveInvoice = () => {
    if (!currentInvoice) return

    // Update transactions
    setTransactions([currentInvoice, ...transactions])

    // Update inventory
    const updatedInventory = [...inventory]
    currentInvoice.items.forEach((item) => {
      const inventoryItemIndex = updatedInventory.findIndex((i) => i.id === item.id)
      if (inventoryItemIndex >= 0) {
        updatedInventory[inventoryItemIndex].stock -= item.quantity
      }
    })
    setInventory(updatedInventory)
    setSyncStatus("local")

    // Reset billing
    setBillingItems([])
    setCustomerInfo({
      name: "",
      mobile: "",
      doctor: "",
      paymentMethod: "",
    })
    setDiscount(0)
    setShowInvoicePreview(false)
    setCurrentInvoice(null)

    toast({
      title: "Success",
      description: "Invoice generated successfully",
    })
  }

  // Handle adding inward entry
  const handleAddInwardEntry = () => {
    if (!newInward.invoiceNo || !newInward.supplier || !newInward.paymentStatus) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    if (inwardItems.some((item) => !item.name || !item.batch || !item.expiry)) {
      toast({
        title: "Error",
        description: "Please fill all item details",
        variant: "destructive",
      })
      return
    }

    // Process inward items
    const processedItems: InventoryItem[] = inwardItems.map((item) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: item.name || "",
      batch: item.batch || "",
      stock: item.stock || 0,
      expiry: item.expiry || "",
      purchasePrice: item.purchasePrice || 0,
      price: item.price || 0,
      gstRate: item.gstRate || 5,
    }))

    // Create new inward entry
    const totalValue = processedItems.reduce((sum, item) => sum + item.purchasePrice * item.stock, 0)
    const newInwardEntry: InwardEntry = {
      id: Date.now().toString(),
      date: newInward.date || new Date().toISOString().split("T")[0],
      invoiceNo: newInward.invoiceNo || "",
      supplier: newInward.supplier || "",
      items: processedItems,
      paymentStatus: newInward.paymentStatus || "",
      totalValue,
    }

    // Update inward entries
    setInwardEntries([newInwardEntry, ...inwardEntries])

    // Update inventory
    const updatedInventory = [...inventory]
    processedItems.forEach((item) => {
      const existingItemIndex = updatedInventory.findIndex((i) => i.name === item.name && i.batch === item.batch)

      if (existingItemIndex >= 0) {
        // Update existing item
        updatedInventory[existingItemIndex].stock += item.stock
      } else {
        // Add new item
        updatedInventory.push(item)
      }
    })
    setInventory(updatedInventory)
    setSyncStatus("local")

    // Reset form
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

  // Handle adding a new inward item row
  const handleAddInwardItemRow = () => {
    setInwardItems([
      ...inwardItems,
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
  }

  // Handle updating inward item
  const handleUpdateInwardItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...inwardItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }
    setInwardItems(updatedItems)
  }

  // Handle removing inward item
  const handleRemoveInwardItem = (index: number) => {
    if (inwardItems.length === 1) return
    const updatedItems = [...inwardItems]
    updatedItems.splice(index, 1)
    setInwardItems(updatedItems)
  }

  // Force manual sync of all data
  const handleManualSync = async () => {
    setSyncStatus("syncing")

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In a real implementation, this would sync with a server or other devices
      // For now, we'll just simulate a successful sync

      // Update last sync time
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)
      setLastSyncTime(currentTime)

      setSyncStatus("synced")

      toast({
        title: "Success",
        description: "Data synchronized successfully",
      })

      return true
    } catch (error) {
      console.error("Error during manual sync:", error)
      setSyncStatus("error")

      toast({
        title: "Sync Failed",
        description: "Please check your internet connection and try again",
        variant: "destructive",
      })

      return false
    }
  }

  // Export data as JSON file
  const handleExportData = () => {
    // Prepare data for export
    const dataToExport = {
      inventory,
      transactions,
      inwardEntries,
      lastSyncTime: new Date().toISOString(),
    }

    // Convert data to JSON string
    const jsonString = JSON.stringify(dataToExport, null, 2)

    // Create a blob from the JSON string
    const blob = new Blob([jsonString], { type: "application/json" })

    // Create a URL for the blob
    const url = URL.createObjectURL(blob)

    // Create a temporary anchor element
    const a = document.createElement("a")
    a.href = url
    a.download = `generic-aadhaar-data-${new Date().toISOString().split("T")[0]}.json`

    // Trigger a click on the anchor element
    document.body.appendChild(a)
    a.click()

    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Data exported successfully",
    })
  }

  // Import data from JSON file
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        // Validate the imported data
        if (!importedData.inventory || !importedData.transactions || !importedData.inwardEntries) {
          throw new Error("Invalid data format")
        }

        // Update all data states
        setInventory(importedData.inventory)
        setTransactions(importedData.transactions)
        setInwardEntries(importedData.inwardEntries)

        // Update last sync time
        const currentTime = new Date().toISOString()
        localStorage.setItem("ga-last-sync-time", currentTime)
        setLastSyncTime(currentTime)

        toast({
          title: "Success",
          description: "Data imported successfully from file",
        })

        setSyncStatus("synced")
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to import data. Invalid file format.",
          variant: "destructive",
        })
      }
    }

    reader.readAsText(file)

    // Reset the input
    event.target.value = ""
  }

  // Handle CSV import from dialog
  const handleCsvImport = (parsedItems: any[]) => {
    try {
      // Convert to inward items format
      const newInwardItemsList = parsedItems.map((item) => ({
        name: item.name,
        batch: item.batch,
        expiry: item.expiry,
        stock: item.stock,
        purchasePrice: item.purchasePrice,
        price: item.price,
        gstRate: item.gstRate,
      }))

      // Update the inward items state
      setInwardItems(newInwardItemsList)

      // Also update the inward details
      setNewInward({
        ...newInward,
        date: new Date().toISOString().split("T")[0],
        invoiceNo: `CSV-${Date.now().toString().substring(8)}`,
        supplier: "CSV Import",
        paymentStatus: "Paid",
      })

      toast({
        title: "Success",
        description: `Processed ${parsedItems.length} items from CSV`,
      })
    } catch (error) {
      console.error("Error processing CSV:", error)
      toast({
        title: "Error",
        description: "Failed to process CSV data. Please check the format.",
        variant: "destructive",
      })
    }
  }

  // Handle image upload for OCR
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)
    setScanProgress(10)

    // Simulate OCR processing
    setTimeout(() => {
      setScanProgress(30)
    }, 500)

    setTimeout(() => {
      setScanProgress(60)
    }, 1000)

    setTimeout(() => {
      setScanProgress(90)

      // Simulate OCR result with some sample data
      const sampleData = [
        {
          name: "Paracetamol",
          batch: "PCM2023",
          expiry: "2024-12-31",
          stock: 100,
          purchasePrice: 0.5,
          price: 2,
          gstRate: 5,
        },
        {
          name: "Amoxicillin",
          batch: "AMX2023",
          expiry: "2024-10-15",
          stock: 50,
          purchasePrice: 1.2,
          price: 5,
          gstRate: 12,
        },
        {
          name: "Cetirizine",
          batch: "CTZ2023",
          expiry: "2025-01-20",
          stock: 75,
          purchasePrice: 0.8,
          price: 3,
          gstRate: 5,
        },
      ]

      // Convert to inward items format and update the state
      const newInwardItemsList = sampleData.map((item) => ({
        name: item.name,
        batch: item.batch,
        expiry: item.expiry,
        stock: item.stock,
        purchasePrice: item.purchasePrice,
        price: item.price,
        gstRate: item.gstRate,
      }))

      // Update the inward items state
      setInwardItems(newInwardItemsList)

      // Also update the inward details
      setNewInward({
        ...newInward,
        date: new Date().toISOString().split("T")[0],
        invoiceNo: `OCR-${Date.now().toString().substring(8)}`,
        supplier: "OCR Import",
        paymentStatus: "Paid",
      })

      setScanResult(JSON.stringify(sampleData, null, 2))
      setScanProgress(100)

      setTimeout(() => {
        setIsScanning(false)
        toast({
          title: "Success",
          description: "Image processed successfully. Found 3 items.",
        })
      }, 500)
    }, 2000)

    event.target.value = ""
  }

  // Handle camera capture
  const handleCameraCapture = () => {
    setShowCamera(true)

    // Simulate taking a photo and processing it
    setTimeout(() => {
      setShowCamera(false)
      setIsScanning(true)
      setScanProgress(10)

      setTimeout(() => {
        setScanProgress(50)

        setTimeout(() => {
          setScanProgress(90)

          // Simulate OCR result with some sample data
          const sampleData = [
            { name: "Aspirin", batch: "ASP2023", expiry: "2024-11-30", stock: 80, purchasePrice: 0.6, price: 2.5 },
            { name: "Ibuprofen", batch: "IBU2023", expiry: "2024-09-15", stock: 60, purchasePrice: 1.0, price: 4 },
          ]

          // Convert to inward items format
          const newInwardItemsList = sampleData.map((item) => ({
            name: item.name,
            batch: item.batch,
            expiry: item.expiry,
            stock: item.stock,
            purchasePrice: item.purchasePrice,
            price: item.price,
          }))

          setInwardItems(newInwardItemsList)

          setScanResult(JSON.stringify(sampleData, null, 2))
          setScanProgress(100)

          setTimeout(() => {
            setIsScanning(false)
            toast({
              title: "Success",
              description: "Image captured and processed successfully. Found 2 items.",
            })
          }, 500)
        }, 1000)
      }, 1000)
    }, 2000)
  }

  // Generate PDF for invoice and return as blob
  const generateInvoicePDFBlob = async (invoice: Transaction) => {
    setIsGeneratingPDF(true)

    try {
      // Use the utility function to generate PDF
      const pdfBlob = await generateInvoicePDF(invoice)
      setCurrentInvoicePdfBlob(pdfBlob)
      setIsGeneratingPDF(false)
      return pdfBlob
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      setIsGeneratingPDF(false)
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      })
      return null
    }
  }

  // Handle downloading invoice PDF
  const handleDownloadInvoicePDF = async (invoice: Transaction) => {
    setIsGeneratingPDF(true)

    try {
      // Generate PDF if not already generated
      let pdfBlob = currentInvoicePdfBlob
      if (!pdfBlob) {
        pdfBlob = await generateInvoicePDF(invoice)
        setCurrentInvoicePdfBlob(pdfBlob)
      }

      // Create a URL for the blob
      const url = URL.createObjectURL(pdfBlob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url
      a.download = `Invoice-${invoice.id}.pdf`

      // Trigger a click on the anchor element
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      })
    } catch (error) {
      console.error("Failed to download PDF:", error)
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Return the JSX for the component
  return (
    <div>
      {/* Your JSX code here */}
      <h1>Generic Aadhaar ERP</h1>
      {/* Rest of your UI components */}
    </div>
  )
}
