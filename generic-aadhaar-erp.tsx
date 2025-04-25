"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import {
  AlertCircle,
  Cloud,
  CloudOff,
  Download,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
  User,
  WifiOff,
} from "lucide-react"
import { jsPDF } from "jspdf"
import Papa from "papaparse"
import { useLocalStorage } from "./hooks/use-local-storage"
import SyncDialog from "./components/sync-dialog"
import MostSoldItems from "./components/most-sold-items"
import type { InwardEntry, SyncStatus } from "./types/erp-types"
import SalesDashboard from "./components/sales-dashboard"
import CustomerReport from "./components/customer-report"

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
  gstRate: number // Add this line
}

export type BillingItem = {
  id: string
  name: string
  batch: string
  quantity: number
  price: number
  total: number
  gstRate: number // Add this line
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
  taxes: { rate: number; amount: number }[] // Replace tax with taxes array
  totalTax: number
  discount: number
  total: number
}

export default function GenericAadhaarERP() {
  const date = new Date().toLocaleString()

  // State for data persistence
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local")
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncCode, setSyncCode] = useState("")
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
  const [connectedPeers, setConnectedPeers] = useState<string[]>([])
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
  const [csvData, setCsvData] = useState<string>("")
  const [parsedCsvData, setParsedCsvData] = useState<any[]>([])
  const [isProcessingCsv, setIsProcessingCsv] = useState(false)
  const [csvProgress, setCsvProgress] = useState(0)
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

  // Declare the missing export functions
  const exportMostSoldReport = () => {
    toast({
      title: "Export Most Sold Items",
      description: "Exporting most sold items report...",
    })
  }

  const handleShareViaWhatsApp = (invoice: Transaction) => {
    toast({
      title: "Share via WhatsApp",
      description: "Sharing invoice via WhatsApp...",
    })
  }

  const exportInventoryReport = () => {
    toast({
      title: "Export Inventory Report",
      description: "Exporting inventory report...",
    })
  }

  const exportSalesReport = () => {
    toast({
      title: "Export Sales Report",
      description: "Exporting sales report...",
    })
  }

  const exportCustomerReport = () => {
    toast({
      title: "Export Customer Report",
      description: "Exporting customer report...",
    })
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

  // Connect to another peer
  const handleConnectToPeer = async (peerId: string): Promise<boolean> => {
    if (!isOnline) return false

    try {
      setSyncStatus("syncing")

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In a real implementation, this would establish a connection to another device
      // For now, we'll just simulate a successful connection

      setConnectedPeers((prev) => {
        if (prev.includes(peerId)) return prev
        return [...prev, peerId]
      })

      // Simulate successful sync after connection
      const currentTime = new Date().toISOString()
      localStorage.setItem("ga-last-sync-time", currentTime)
      setLastSyncTime(currentTime)

      setSyncStatus("connected")

      toast({
        title: "Connected",
        description: `Connected to device ${peerId.substring(0, 8)}`,
      })

      return true
    } catch (error) {
      console.error("Error connecting to peer:", error)
      setSyncStatus("error")

      toast({
        title: "Connection Failed",
        description: "Could not connect to the specified device",
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

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {
      const csvContent = e.target?.result as string
      setCsvData(csvContent)
      setIsProcessingCsv(true)
      setCsvProgress(10)

      // Parse CSV data
      Papa.parse(csvContent, {
        header: true,
        complete: (results) => {
          setCsvProgress(50)

          // Process the parsed data
          setTimeout(() => {
            try {
              const parsedItems = results.data
                .filter((row: any) => row.name && row.batch) // Filter out empty rows
                .map((row: any) => ({
                  name: row.name || row.Name || row.MEDICINE_NAME || "",
                  batch: row.batch || row.Batch || row.BATCH_NO || "",
                  expiry: row.expiry || row.Expiry || row.EXPIRY_DATE || new Date().toISOString().split("T")[0],
                  stock: Number.parseInt(row.quantity || row.Quantity || row.STOCK || "0", 10),
                  purchasePrice: Number.parseFloat(row.purchasePrice || row.PurchasePrice || row.PURCHASE_PRICE || "0"),
                  price: Number.parseFloat(row.price || row.Price || row.MRP || "0"),
                }))

              setParsedCsvData(parsedItems)
              setCsvProgress(100)

              // Convert to inward items format
              const newInwardItemsList = parsedItems.map((item) => ({
                name: item.name,
                batch: item.batch,
                expiry: item.expiry,
                stock: item.stock,
                purchasePrice: item.purchasePrice,
                price: item.price,
              }))

              setInwardItems(newInwardItemsList)

              setTimeout(() => {
                setIsProcessingCsv(false)
                toast({
                  title: "Success",
                  description: `Processed ${parsedItems.length} items from CSV`,
                })
              }, 500)
            } catch (error) {
              setIsProcessingCsv(false)
              toast({
                title: "Error",
                description: "Failed to process CSV data. Please check the format.",
                variant: "destructive",
              })
            }
          }, 1000)
        },
        error: (error) => {
          setIsProcessingCsv(false)
          toast({
            title: "Error",
            description: "Failed to parse CSV file: " + error.message,
            variant: "destructive",
          })
        },
      })
    }

    reader.readAsText(file)
    event.target.value = ""
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
        { name: "Paracetamol", batch: "PCM2023", expiry: "2024-12-31", stock: 100, purchasePrice: 0.5, price: 2 },
        { name: "Amoxicillin", batch: "AMX2023", expiry: "2024-10-15", stock: 50, purchasePrice: 1.2, price: 5 },
        { name: "Cetirizine", batch: "CTZ2023", expiry: "2025-01-20", stock: 75, purchasePrice: 0.8, price: 3 },
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
  const generateInvoicePDFBlob = (invoice: Transaction) => {
    setIsGeneratingPDF(true)

    setTimeout(() => {
      try {
        const doc = new jsPDF()

        // Add header
        doc.setFontSize(20)
        doc.text("Generic Aadhaar Pharmacy", 105, 20, { align: "center" })

        doc.setFontSize(12)
        doc.text("Invoice", 105, 30, { align: "center" })

        // Add invoice details
        doc.setFontSize(10)
        doc.text(`Invoice #: ${invoice.id}`, 15, 40)
        doc.text(`Date: ${invoice.date}`, 15, 45)
        doc.text(`Time: ${invoice.time}`, 15, 50)

        // Add customer details
        doc.text(`Customer: ${invoice.customer}`, 15, 60)
        doc.text(`Mobile: ${invoice.mobile}`, 15, 65)
        if (invoice.doctor) {
          doc.text(`Doctor: ${invoice.doctor}`, 15, 70)
        }
        if (invoice.paymentMethod) {
          doc.text(`Payment Method: ${invoice.paymentMethod}`, 15, 75)
        }

        // Add items table
        const tableColumn = ["Item", "Batch", "Qty", "Price", "GST", "Total"]
        const tableRows = invoice.items.map((item) => [
          item.name,
          item.batch,
          item.quantity.toString(),
          `₹${item.price.toFixed(2)}`,
          `${item.gstRate}%`,
          `₹${item.total.toFixed(2)}`,
        ])

        // @ts-ignore - jspdf-autotable types are not included
        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 85,
          theme: "grid",
          headStyles: {
            fillColor: [14, 165, 233], // brand-500 color
            textColor: 255,
          },
        })

        // Add summary
        const finalY = (doc as any).lastAutoTable.finalY || 120
        doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, 150, finalY + 10, { align: "right" })

        // Add GST breakdown
        let yOffset = finalY + 15
        invoice.taxes.forEach((tax, index) => {
          doc.text(`GST (${tax.rate}%): ₹${tax.amount.toFixed(2)}`, 150, yOffset, { align: "right" })
          yOffset += 5
        })

        doc.text(`Discount: ₹${invoice.discount.toFixed(2)}`, 150, yOffset, { align: "right" })
        doc.text(`Total: ₹${invoice.total.toFixed(2)}`, 150, yOffset + 5, { align: "right" })

        // Add footer
        doc.setFontSize(8)
        doc.text("Thank you for shopping with Generic Aadhaar Pharmacy!", 105, finalY + 40, { align: "center" })
        doc.text("For any queries, please contact us at 1800-XXX-XXXX", 105, finalY + 45, { align: "center" })

        // Get PDF as blob
        const pdfBlob = doc.output("blob")
        setCurrentInvoicePdfBlob(pdfBlob)

        setIsGeneratingPDF(false)
        return pdfBlob
      } catch (error) {
        console.error("Failed to generate PDF:", error)
        setIsGeneratingPDF(false)
        return null
      }
    }, 1000)
  }

  // Update the generateInvoicePDF function to handle itemized taxes
  const generateInvoicePDF = (invoice: Transaction) => {
    setIsGeneratingPDF(true)

    setTimeout(() => {
      try {
        const doc = new jsPDF()

        // Add header
        doc.setFontSize(20)
        doc.text("Generic Aadhaar Pharmacy", 105, 20, { align: "center" })

        doc.setFontSize(12)
        doc.text("Invoice", 105, 30, { align: "center" })

        // Add invoice details
        doc.setFontSize(10)
        doc.text(`Invoice #: ${invoice.id}`, 15, 40)
        doc.text(`Date: ${invoice.date}`, 15, 45)
        doc.text(`Time: ${invoice.time}`, 15, 50)

        // Add customer details
        doc.text(`Customer: ${invoice.customer}`, 15, 60)
        doc.text(`Mobile: ${invoice.mobile}`, 15, 65)
        if (invoice.doctor) {
          doc.text(`Doctor: ${invoice.doctor}`, 15, 70)
        }
        if (invoice.paymentMethod) {
          doc.text(`Payment Method: ${invoice.paymentMethod}`, 15, 75)
        }

        // Add items table
        const tableColumn = ["Item", "Batch", "Qty", "Price", "GST", "Total"]
        const tableRows = invoice.items.map((item) => [
          item.name,
          item.batch,
          item.quantity.toString(),
          `₹${item.price.toFixed(2)}`,
          `${item.gstRate}%`,
          `₹${item.total.toFixed(2)}`,
        ])

        // @ts-ignore - jspdf-autotable types are not included
        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 85,
          theme: "grid",
          headStyles: {
            fillColor: [14, 165, 233], // brand-500 color
            textColor: 255,
          },
        })

        // Add summary
        const finalY = (doc as any).lastAutoTable.finalY || 120
        doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, 150, finalY + 10, { align: "right" })

        // Add GST breakdown
        let yOffset = finalY + 15
        invoice.taxes.forEach((tax, index) => {
          doc.text(`GST (${tax.rate}%): ₹${tax.amount.toFixed(2)}`, 150, yOffset, { align: "right" })
          yOffset += 5
        })

        doc.text(`Discount: ₹${invoice.discount.toFixed(2)}`, 150, yOffset, { align: "right" })
        doc.text(`Total: ₹${invoice.total.toFixed(2)}`, 150, yOffset + 5, { align: "right" })

        // Add footer
        doc.setFontSize(8)
        doc.text("Thank you for shopping with Generic Aadhaar Pharmacy!", 105, yOffset + 20, { align: "center" })
        doc.text("For any queries, please contact us at 1800-XXX-XXXX", 105, yOffset + 25, { align: "center" })

        // Save the PDF
        doc.save(`Invoice-${invoice.id}.pdf`)

        toast({
          title: "Success",
          description: "Invoice PDF generated successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate PDF",
          variant: "destructive",
        })
      } finally {
        setIsGeneratingPDF(false)
      }
    }, 1000)
  }

  // Update the UI to include GST rate in inventory and billing
  // Replace the return statement with the updated UI
  return (
    <div className="p-4 bg-gradient-to-br from-brand-50 to-accent1-50 min-h-screen text-neutral-800">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-white rounded-xl shadow-soft p-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-brand-500 to-accent1-500 text-white p-3 rounded-lg shadow-glow">
            <h1 className="text-3xl font-bold">🧬 Generic Aadhaar</h1>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-medium text-neutral-600">Pharmacy ERP</span>
            <Badge variant="outline" className="bg-brand-100 text-brand-800 animate-pulse-gentle">
              v2.0
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-xs hover:bg-brand-50"
              onClick={() => setShowSyncDialog(true)}
            >
              {syncStatus === "synced" || syncStatus === "connected" ? (
                <Cloud className="h-4 w-4 text-brand-500" />
              ) : syncStatus === "syncing" ? (
                <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
              ) : syncStatus === "error" ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : syncStatus === "offline" || syncStatus === "disconnected" ? (
                <WifiOff className="h-4 w-4 text-neutral-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-neutral-500" />
              )}
              {lastSyncTime ? (
                <span>Last sync: {new Date(lastSyncTime).toLocaleString()}</span>
              ) : (
                <span>Not synced</span>
              )}
            </Button>
          </div>
          <span className="text-sm text-neutral-600">{date}</span>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-brand-50">
            <Settings className="h-5 w-5 text-brand-600" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-brand-50">
            <User className="h-5 w-5 text-brand-600" />
          </Button>
        </div>
      </header>

      {/* Sync Dialog */}
      <SyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        deviceId={deviceId}
        syncStatus={syncStatus}
        connectedPeers={connectedPeers}
        onConnect={handleConnectToPeer}
        onSync={handleManualSync}
        isOnline={isOnline}
        lastSyncTime={lastSyncTime}
      />

      {/* Tabs */}
      <Tabs defaultValue="home" className="w-full">
        <TabsList className="mb-6 bg-white rounded-lg shadow-soft p-1">
          <TabsTrigger value="home" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            🏠 Home
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            🧾 Billing
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            📦 Inventory
          </TabsTrigger>
          <TabsTrigger value="inward" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            📤 Inward
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
            📊 Reports
          </TabsTrigger>
        </TabsList>

        {/* Home */}
        <TabsContent value="home">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="overflow-hidden border-none shadow-soft hover:shadow-glow transition-shadow duration-300">
              <div className="h-2 bg-gradient-to-r from-brand-400 to-brand-600"></div>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Today's Sales</p>
                  <p className="text-2xl font-bold text-brand-700">₹{stats.todaySales.toFixed(2)}</p>
                </div>
                <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center animate-float">
                  <Receipt className="h-7 w-7 text-brand-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-none shadow-soft hover:shadow-glow transition-shadow duration-300">
              <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.lowStockCount} Items</p>
                </div>
                <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center animate-float">
                  <AlertCircle className="h-7 w-7 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-none shadow-soft hover:shadow-glow transition-shadow duration-300">
              <div className="h-2 bg-gradient-to-r from-accent1-400 to-accent1-600"></div>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Invoices Generated</p>
                  <p className="text-2xl font-bold text-accent1-700">{stats.invoicesGenerated}</p>
                </div>
                <div className="h-14 w-14 rounded-full bg-accent1-100 flex items-center justify-center animate-float">
                  <FileText className="h-7 w-7 text-accent1-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Dashboard Charts */}
          <SalesDashboard transactions={transactions} />

          <div className="mt-4 text-center italic text-lg text-brand-700 bg-white p-4 rounded-lg shadow-soft">
            "Great service begins with great health."
          </div>

          {/* Most Sold Items */}
          <div className="mt-6">
            <MostSoldItems transactions={transactions} onExport={exportMostSoldReport} />
          </div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="grid gap-4">
            <Card className="border-none shadow-soft">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    placeholder="Customer Name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                  />
                  <Input
                    placeholder="Mobile Number"
                    value={customerInfo.mobile}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, mobile: e.target.value })}
                    className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex gap-2">
                    <select
                      className="flex h-10 w-full rounded-md border border-brand-200 bg-background px-3 py-2 text-sm ring-offset-background focus:border-brand-500 focus:ring-brand-500"
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                    >
                      <option value="">Select Medicine</option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.batch}) - ₹{item.price.toFixed(2)} - GST: {item.gstRate}%
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAddToBilling}
                      disabled={!selectedItem}
                      className="bg-brand-500 hover:bg-brand-600"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Doctor Name (Optional)"
                    value={customerInfo.doctor}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, doctor: e.target.value })}
                    className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-brand-200 bg-background px-3 py-2 text-sm ring-offset-background focus:border-brand-500 focus:ring-brand-500"
                    value={customerInfo.paymentMethod}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, paymentMethod: e.target.value })}
                  >
                    <option value="">Payment Method</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Billing Items Table */}
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">GST Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingItems.length > 0 ? (
                      billingItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-brand-50">
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.batch}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-brand-200"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-brand-200"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.gstRate}%</TableCell>
                          <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-red-50 hover:text-red-500"
                              onClick={() => handleRemoveFromBilling(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-neutral-500 py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Receipt className="h-8 w-8 text-neutral-400" />
                            <p>No items added yet</p>
                            <p className="text-sm text-neutral-400">Select medicines from the dropdown above</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Billing Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Card className="border-none shadow-soft">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="discount">Discount (₹)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="max-w-[150px] border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>

                    {taxes.length > 0 && (
                      <div className="mt-4">
                        <GSTBreakdown taxes={taxes} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="border-none shadow-soft">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      {taxes.map((tax, index) => (
                        <div key={index} className="flex justify-between">
                          <span>GST ({tax.rate}%):</span>
                          <span>₹{tax.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>₹{discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Total:</span>
                        <span className="text-brand-700">₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBillingItems([])
                  setCustomerInfo({
                    name: "",
                    mobile: "",
                    doctor: "",
                    paymentMethod: "",
                  })
                  setDiscount(0)
                }}
                className="border-brand-200 hover:bg-brand-50"
              >
                Clear
              </Button>
              <Button
                onClick={handleGenerateInvoice}
                disabled={billingItems.length === 0}
                className="bg-brand-500 hover:bg-brand-600"
              >
                Generate Invoice
              </Button>
            </div>
          </div>

          {/* Invoice Preview Dialog */}
          {showInvoicePreview && currentInvoice && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft">
                <h2 className="text-2xl font-bold mb-4 text-brand-700">Invoice Preview</h2>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p>
                        <strong>Invoice #:</strong> {currentInvoice.id}
                      </p>
                      <p>
                        <strong>Date:</strong> {currentInvoice.date}
                      </p>
                      <p>
                        <strong>Time:</strong> {currentInvoice.time}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Customer:</strong> {currentInvoice.customer}
                      </p>
                      <p>
                        <strong>Mobile:</strong> {currentInvoice.mobile}
                      </p>
                      {currentInvoice.doctor && (
                        <p>
                          <strong>Doctor:</strong> {currentInvoice.doctor}
                        </p>
                      )}
                      {currentInvoice.paymentMethod && (
                        <p>
                          <strong>Payment:</strong> {currentInvoice.paymentMethod}
                        </p>
                      )}
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead>Medicine</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>GST Rate</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.batch}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.gstRate}%</TableCell>
                          <TableCell>₹{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{currentInvoice.subtotal.toFixed(2)}</span>
                      </div>
                      {currentInvoice.taxes.map((tax, index) => (
                        <div className="flex justify-between" key={index}>
                          <span>GST ({tax.rate}%):</span>
                          <span>₹{tax.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>₹{currentInvoice.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-brand-700">
                        <span>Total:</span>
                        <span>₹{currentInvoice.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowInvoicePreview(false)}
                      className="border-brand-200 hover:bg-brand-50"
                    >
                      Cancel
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => generateInvoicePDF(currentInvoice)}
                        disabled={isGeneratingPDF}
                        className="border-brand-200 hover:bg-brand-50"
                      >
                        {isGeneratingPDF ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShareViaWhatsApp(currentInvoice)}
                        disabled={isGeneratingPDF}
                        className="border-brand-200 hover:bg-brand-50"
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Share via WhatsApp
                      </Button>
                      <Button onClick={handleSaveInvoice} className="bg-brand-500 hover:bg-brand-600">
                        Save Invoice
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 w-full max-w-md">
              <Input
                placeholder="Search medicine or batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-brand-200 focus:border-brand-500 focus:ring-brand-500"
              />
              <Button variant="ghost" size="icon" className="hover:bg-brand-50">
                <Search className="h-4 w-4 text-brand-600" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportInventoryReport()}
                className="border-brand-200 hover:bg-brand-50"
              >
                <Download className="h-4 w-4 mr-2 text-brand-600" />
                Export
              </Button>
              <Button onClick={() => setShowAddInventory(true)} className="bg-brand-500 hover:bg-brand-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-soft">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-brand-50">
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell className={`text-right ${item.stock < 10 ? "text-red-500 font-bold" : ""}`}>
                          {item.stock}
                        </TableCell>
                        <TableCell>{item.expiry}</TableCell>
                        <TableCell>{item.gstRate}%</TableCell>
                        <TableCell>₹{item.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell>₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>₹{(item.stock * item.price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-neutral-500 py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-neutral-400" />
                          <p>{searchTerm ? "No items match your search" : "No inventory items found"}</p>
                          <p className="text-sm text-neutral-400">Try adding some items or adjusting your search</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add Inventory Dialog */}
          {showAddInventory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-soft">
                <h2 className="text-2xl font-bold mb-4 text-brand-700">Add Inventory Item</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Medicine Name</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch">Batch Number</Label>
                    <Input
                      id="batch"
                      value={newItem.batch}
                      onChange={(e) => setNewItem({ ...newItem, batch: e.target.value })}
                      className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Quantity</Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={newItem.stock}
                        onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                        className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        type="date"
                        value={newItem.expiry}
                        onChange={(e) => setNewItem({ ...newItem, expiry: e.target.value })}
                        className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">Purchase Price (₹)</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.purchasePrice}
                        onChange={(e) => setNewItem({ ...newItem, purchasePrice: Number(e.target.value) })}
                        className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Selling Price (₹)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                        className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstRate">GST Rate (%)</Label>
                      <select
                        id="gstRate"
                        value={newItem.gstRate}
                        onChange={(e) => setNewItem({ ...newItem, gstRate: Number(e.target.value) })}
                        className="flex h-10 w-full rounded-md border border-brand-200 bg-background px-3 py-2 text-sm ring-offset-background focus:border-brand-500 focus:ring-brand-500"
                      >
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5% (Essential)</option>
                        <option value="12">12% (Standard)</option>
                        <option value="18">18% (Standard)</option>
                        <option value="28">28% (Luxury)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddInventory(false)}
                      className="border-brand-200 hover:bg-brand-50"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddInventoryItem} className="bg-brand-500 hover:bg-brand-600">
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Inward */}
        <TabsContent value="inward">
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold text-brand-700">Inward Stock Entry</h2>
            <Tabs defaultValue="manual">
              <TabsList className="bg-white rounded-lg shadow-soft p-1">
                <TabsTrigger value="manual" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="csv" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
                  CSV Upload
                </TabsTrigger>
                <TabsTrigger value="ocr" className="data-[state=active]:bg-brand-500 data-[state=active]:text-white">
                  Image OCR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 pt-4">
                <Card className="border-none shadow-soft">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoiceNo">Invoice Number</Label>
                        <Input
                          id="invoiceNo"
                          value={newInward.invoiceNo}
                          onChange={(e) => setNewInward({ ...newInward, invoiceNo: e.target.value })}
                          className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          value={newInward.supplier}
                          onChange={(e) => setNewInward({ ...newInward, supplier: e.target.value })}
                          className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newInward.date}
                          onChange={(e) => setNewInward({ ...newInward, date: e.target.value })}
                          className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <select
                        id="paymentStatus"
                        className="flex h-10 w-full rounded-md border border-brand-200 bg-background px-3 py-2 text-sm ring-offset-background focus:border-brand-500 focus:ring-brand-500"
                        value={newInward.paymentStatus}
                        onChange={(e) => setNewInward({ ...newInward, paymentStatus: e.target.value })}
                      >
                        <option value="">Select Payment Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-soft">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Items</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddInwardItemRow}
                          className="border-brand-200 hover:bg-brand-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      </div>

                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-neutral-50">
                              <TableHead>Medicine</TableHead>
                              <TableHead>Batch</TableHead>
                              <TableHead>Expiry</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Purchase Price</TableHead>
                              <TableHead className="text-right">Selling Price</TableHead>
                              <TableHead className="text-right">GST Rate</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inwardItems.map((item, index) => (
                              <TableRow key={index} className="hover:bg-brand-50">
                                <TableCell>
                                  <Input
                                    value={item.name}
                                    onChange={(e) => handleUpdateInwardItem(index, "name", e.target.value)}
                                    placeholder="Medicine name"
                                    className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.batch}
                                    onChange={(e) => handleUpdateInwardItem(index, "batch", e.target.value)}
                                    placeholder="Batch"
                                    className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="date"
                                    value={item.expiry}
                                    onChange={(e) => handleUpdateInwardItem(index, "expiry", e.target.value)}
                                    className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.stock}
                                    onChange={(e) => handleUpdateInwardItem(index, "stock", Number(e.target.value))}
                                    className="text-right border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.purchasePrice}
                                    onChange={(e) =>
                                      handleUpdateInwardItem(index, "purchasePrice", Number(e.target.value))
                                    }
                                    className="text-right border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => handleUpdateInwardItem(index, "price", Number(e.target.value))}
                                    className="text-right border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                                  />
                                </TableCell>
                                <TableCell>
                                  <select
                                    value={item.gstRate}
                                    onChange={(e) => handleUpdateInwardItem(index, "gstRate", Number(e.target.value))}
                                    className="flex h-10 w-full rounded-md border border-brand-200 bg-background px-3 py-2 text-sm ring-offset-background focus:border-brand-500 focus:ring-brand-500"
                                  >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                  </select>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                                    onClick={() => handleRemoveInwardItem(index)}
                                    disabled={inwardItems.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
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
                    }}
                    className="border-brand-200 hover:bg-brand-50"
                  >
                    Clear
                  </Button>
                  <Button onClick={handleAddInwardEntry} className="bg-brand-500 hover:bg-brand-600">
                    Save Inward Entry
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 pt-4">
                <Card className="border-none shadow-soft">
                  <CardContent className="p-6">
                    <div className="rounded-md bg-blue-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">CSV Format</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>Your CSV file should have the following columns:</p>
                            <p className="font-mono text-xs mt-1">name,batch,expiry,stock,purchasePrice,price</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        ref={csvInputRef}
                        className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (csvInputRef.current) {
                            csvInputRef.current.value = ""
                          }
                          setCsvData("")
                          setParsedCsvData([])
                        }}
                        className="border-brand-200 hover:bg-brand-50"
                      >
                        Clear
                      </Button>
                    </div>

                    {isProcessingCsv && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Processing CSV...</span>
                          <span>{csvProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${csvProgress}%` }}></div>
                        </div>
                      </div>
                    )}

                    {parsedCsvData.length > 0 && (
                      <div className="pt-4">
                        <h3 className="font-medium mb-2 text-brand-700">Preview ({parsedCsvData.length} items)</h3>
                        <div className="border rounded-md max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-neutral-50">
                                <TableHead>Medicine</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Purchase Price</TableHead>
                                <TableHead className="text-right">Selling Price</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedCsvData.slice(0, 10).map((item, index) => (
                                <TableRow key={index} className="hover:bg-brand-50">
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell>{item.batch}</TableCell>
                                  <TableCell>{item.expiry}</TableCell>
                                  <TableCell className="text-right">{item.stock}</TableCell>
                                  <TableCell className="text-right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                              {parsedCsvData.length > 10 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-neutral-500">
                                    ... and {parsedCsvData.length - 10} more items
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button onClick={handleAddInwardEntry} className="bg-brand-500 hover:bg-brand-600">
                            Save Inward Entry
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ocr" className="space-y-4 pt-4">
                <Card className="border-none shadow-soft">
                  <CardContent className="p-6">
                    <div className="rounded-md bg-blue-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Image OCR</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>Upload an image of your invoice or stock list to automatically extract data.</p>
                            <p className="mt-1">For best results, ensure the image is clear and well-lit.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader()
                              reader.onload = () => {
                                // Handle image upload
                              }
                              reader.readAsDataURL(e.target.files[0])
                            }
                          }}
                          ref={fileInputRef}
                          className="border-brand-200 focus:border-brand-500 focus:ring-brand-500"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.click()
                            }
                          }}
                          className="border-brand-200 hover:bg-brand-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>

                      {isScanning && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Scanning image...</span>
                            <span>{scanProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${scanProgress}%` }}></div>
                          </div>
                        </div>
                      )}

                      {inwardItems.length > 0 && inwardItems[0].name && (
                        <div className="pt-4">
                          <h3 className="font-medium mb-2 text-brand-700">Extracted Items</h3>
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-neutral-50">
                                  <TableHead>Medicine</TableHead>
                                  <TableHead>Batch</TableHead>
                                  <TableHead>Expiry</TableHead>
                                  <TableHead className="text-right">Quantity</TableHead>
                                  <TableHead className="text-right">Purchase Price</TableHead>
                                  <TableHead className="text-right">Selling Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {inwardItems.map((item, index) => (
                                  <TableRow key={index} className="hover:bg-brand-50">
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.batch}</TableCell>
                                    <TableCell>{item.expiry}</TableCell>
                                    <TableCell className="text-right">{item.stock}</TableCell>
                                    <TableCell className="text-right">
                                      ₹{(item.purchasePrice || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">₹{(item.price || 0).toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button onClick={handleAddInwardEntry} className="bg-brand-500 hover:bg-brand-600">
                              Save Inward Entry
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <h3 className="text-xl font-semibold mt-6 text-brand-700">Recent Inward Entries</h3>
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inwardEntries.length > 0 ? (
                      inwardEntries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-brand-50">
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>{entry.invoiceNo}</TableCell>
                          <TableCell>{entry.supplier}</TableCell>
                          <TableCell className="text-right">{entry.items.length}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.paymentStatus === "Paid"
                                  ? "outline"
                                  : entry.paymentStatus === "Pending"
                                    ? "secondary"
                                    : "default"
                              }
                            >
                              {entry.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">₹{entry.totalValue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-neutral-500 py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-neutral-400" />
                            <p>No inward entries found</p>
                            <p className="text-sm text-neutral-400">Add new entries using the form above</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-brand-700">Sales Report</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSalesReport}
                    className="border-brand-200 hover:bg-brand-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Today's Sales:</span>
                    <span>₹{stats.todaySales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month's Sales:</span>
                    <span>₹{(stats.todaySales * 15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Invoices:</span>
                    <span>{transactions.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-brand-700">Inventory Summary</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportInventoryReport}
                    className="border-brand-200 hover:bg-brand-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span>{inventory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Stock Items:</span>
                    <span className="text-red-500 font-bold">{stats.lowStockCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Stock Value:</span>
                    <span>₹{inventory.reduce((sum, item) => sum + item.stock * item.price, 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Report */}
          <div className="mb-6">
            <CustomerReport transactions={transactions} onExport={exportCustomerReport} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-brand-700">Most Sold Items</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportMostSoldReport}
                    className="border-brand-200 hover:bg-brand-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <MostSoldItems transactions={transactions} onExport={exportMostSoldReport} />
              </CardContent>
            </Card>

            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-brand-700">Recent Transactions</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSalesReport}
                    className="border-brand-200 hover:bg-brand-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 5).map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-brand-50">
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.customer}</TableCell>
                          <TableCell className="text-right">₹{transaction.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-neutral-500">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-neutral-400" />
                              <p>No transactions found</p>
                              <p className="text-sm text-neutral-400">Generate some invoices to see recent activity</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
