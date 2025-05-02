"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, WifiOff, User, CreditCard, Banknote, Smartphone, AlertCircle, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Import types
import type { InventoryItem, Transaction, InwardEntry } from "./types/erp-types"

// Import custom hooks
import { useInventorySync, useTransactionsSync, useInwardEntriesSync } from "./hooks/use-reliable-sync"

// Import components
import { EnhancedSyncDialog } from "./components/enhanced-sync-dialog"
import FirebaseConfigDialog from "./components/firebase-config-dialog"
import SimplifiedBilling from "./components/simplified-billing"
import SimplifiedInventory from "./components/simplified-inventory"
import EnhancedInwardWithCSV from "./components/enhanced-inward-with-csv"
import SimplifiedReports from "./components/simplified-reports"
import { AuthProvider } from "./contexts/auth-context"

function ERPContent() {
  // Mock auth functions since we're not using the actual useAuth hook here
  const user = { name: "Demo User", role: "admin" }
  const isLoading = false
  const logout = () => console.log("Logout clicked")
  const isAdmin = () => user.role === "admin"
  const switchUser = (role: string) => console.log(`Switch to ${role} clicked`)

  const date = new Date().toLocaleString()
  const [activeTab, setActiveTab] = useState("home")

  // State for data persistence with sync hooks
  const [inventory, setInventory, inventorySyncStatus, inventorySyncInfo] = useInventorySync([])
  const [transactions, setTransactions, transactionsSyncStatus, transactionsSyncInfo] = useTransactionsSync([])
  const [inwardEntries, setInwardEntries, inwardEntriesSyncStatus, inwardEntriesSyncInfo] = useInwardEntriesSync([])

  // Cycle audit state
  const [showCycleAudit, setShowCycleAudit] = useState(false)
  const [auditItems, setAuditItems] = useState<InventoryItem[]>([])
  const [currentAuditIndex, setCurrentAuditIndex] = useState(0)
  const [auditResults, setAuditResults] = useState<{ id: string; expected: number; actual: number }[]>([])
  const [auditCompleted, setAuditCompleted] = useState(false)

  // Use ref to track if audit check has been performed
  const auditCheckedRef = useRef(false)

  // Sync dialog state
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showFirebaseConfigDialog, setShowFirebaseConfigDialog] = useState(false)

  // Stats for dashboard
  const [todaySales, setTodaySales] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [todayInvoiceCount, setTodayInvoiceCount] = useState(0)
  const [isRefreshingStats, setIsRefreshingStats] = useState(false)

  // Payment method stats
  const [paymentStats, setPaymentStats] = useState({
    cash: 0,
    card: 0,
    upi: 0,
    other: 0,
  })

  // Device ID for sync
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

  // Online status
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : false)

  // Check if cycle audit should be shown (once per day)
  // Using a ref to prevent infinite loops
  useEffect(() => {
    if (typeof window === "undefined" || auditCheckedRef.current || inventory.length === 0) return

    const today = new Date().toISOString().split("T")[0]
    const lastAuditDate = localStorage.getItem("ga-last-audit-date")

    if (lastAuditDate !== today) {
      // Select 5 random items for audit or fewer if inventory has less items
      const itemCount = Math.min(5, inventory.length)
      const shuffled = [...inventory].sort(() => 0.5 - Math.random())
      const selected = shuffled.slice(0, itemCount)

      setAuditItems(selected)
      setShowCycleAudit(true)
    }

    // Mark that we've checked for audit
    auditCheckedRef.current = true
  }, [inventory])

  // Update online status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "You're back online",
        description: "Your data will now sync automatically",
        className: "bg-green-50 border-green-200",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're offline",
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

  // Update dashboard stats whenever transactions or inventory changes
  useEffect(() => {
    updateDashboardStats()
  }, [transactions, inventory])

  // Function to update dashboard stats
  const updateDashboardStats = () => {
    // Calculate today's sales
    const today = new Date().toISOString().split("T")[0]
    const todayTransactions = transactions.filter((transaction) => transaction.date === today)

    const todaySalesTotal = todayTransactions.reduce((sum, transaction) => sum + transaction.total, 0)
    setTodaySales(todaySalesTotal)

    // Calculate today's invoice count
    const todayInvoices = todayTransactions.length
    setTodayInvoiceCount(todayInvoices)

    // Calculate low stock count
    const lowStockItems = inventory.filter((item) => item.stock <= 10).length
    setLowStockCount(lowStockItems)

    // Calculate payment method stats
    const paymentMethodCounts = {
      cash: 0,
      card: 0,
      upi: 0,
      other: 0,
    }

    todayTransactions.forEach((transaction) => {
      const method = transaction.paymentMethod?.toLowerCase() || "other"
      if (method.includes("cash")) {
        paymentMethodCounts.cash += transaction.total
      } else if (method.includes("card")) {
        paymentMethodCounts.card += transaction.total
      } else if (method.includes("upi") || method.includes("phonepe") || method.includes("gpay")) {
        paymentMethodCounts.upi += transaction.total
      } else {
        paymentMethodCounts.other += transaction.total
      }
    })

    setPaymentStats(paymentMethodCounts)
  }

  // Handle manual refresh of dashboard stats
  const handleRefreshStats = async () => {
    setIsRefreshingStats(true)

    try {
      // Force sync all data
      await inventorySyncInfo.sync()
      await transactionsSyncInfo.sync()
      await inwardEntriesSyncInfo.sync()

      // Update stats
      updateDashboardStats()

      toast({
        title: "Dashboard Refreshed",
        description: "Latest data has been loaded from all devices",
        className: "bg-green-50 border-green-200",
      })
    } catch (error) {
      console.error("Error refreshing dashboard:", error)
      toast({
        title: "Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshingStats(false)
    }
  }

  // Derive overall sync status
  const syncStatus = (() => {
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
    if (
      inventorySyncStatus === "loading" ||
      transactionsSyncStatus === "loading" ||
      inwardEntriesSyncStatus === "loading"
    ) {
      return "loading"
    }
    return "synced"
  })()

  // Get last sync time
  const lastSyncTime = (() => {
    const times = [
      inventorySyncInfo.lastSyncTime,
      transactionsSyncInfo.lastSyncTime,
      inwardEntriesSyncInfo.lastSyncTime,
    ].filter(Boolean) as string[]

    if (times.length === 0) return undefined

    return times.sort().pop()
  })()

  // Force sync all data
  const handleForceSync = async () => {
    try {
      const results = await Promise.all([
        inventorySyncInfo.sync(),
        transactionsSyncInfo.sync(),
        inwardEntriesSyncInfo.sync(),
      ])

      // If any sync failed, return false
      return results.every((result) => result === true)
    } catch (error) {
      console.error("Error during force sync:", error)
      return false
    }
  }

  // Handle creating a new invoice
  const handleCreateInvoice = (invoice: Transaction) => {
    // Add to transactions
    const updatedTransactions = [invoice, ...transactions]
    setTransactions(updatedTransactions)

    // Update dashboard stats immediately
    const today = new Date().toISOString().split("T")[0]
    if (invoice.date === today) {
      setTodaySales((prev) => prev + invoice.total)
      setTodayInvoiceCount((prev) => prev + 1)

      // Update payment stats
      const method = invoice.paymentMethod?.toLowerCase() || "other"
      setPaymentStats((prev) => {
        const newStats = { ...prev }
        if (method.includes("cash")) {
          newStats.cash += invoice.total
        } else if (method.includes("card")) {
          newStats.card += invoice.total
        } else if (method.includes("upi") || method.includes("phonepe") || method.includes("gpay")) {
          newStats.upi += invoice.total
        } else {
          newStats.other += invoice.total
        }
        return newStats
      })
    }

    toast({
      title: "Success",
      description: "Invoice created successfully",
      className: "bg-green-50 border-green-200",
    })
  }

  // Handle updating inventory
  const handleUpdateInventory = (updatedInventory: InventoryItem[]) => {
    setInventory(updatedInventory)

    // Update low stock count
    const lowStockItems = updatedInventory.filter((item) => item.stock <= 10).length
    setLowStockCount(lowStockItems)
  }

  // Handle saving inward entry
  const handleSaveInward = (entry: InwardEntry, newItems: InventoryItem[]) => {
    // Add inward entry
    setInwardEntries([entry, ...inwardEntries])

    // Update inventory
    const updatedInventory = [...inventory]

    for (const newItem of newItems) {
      const existingItemIndex = updatedInventory.findIndex(
        (item) => item.batch === newItem.batch && item.name === newItem.name,
      )

      if (existingItemIndex >= 0) {
        // Update existing item
        updatedInventory[existingItemIndex] = {
          ...updatedInventory[existingItemIndex],
          stock: updatedInventory[existingItemIndex].stock + newItem.stock,
          // Update other properties if needed
          purchasePrice: newItem.purchasePrice,
          price: newItem.price,
          expiry: newItem.expiry,
        }
      } else {
        // Add new item
        updatedInventory.push({
          ...newItem,
          id: newItem.id || uuidv4(),
        })
      }
    }

    setInventory(updatedInventory)

    // Update low stock count
    const lowStockItems = updatedInventory.filter((item) => item.stock <= 10).length
    setLowStockCount(lowStockItems)

    toast({
      title: "Success",
      description: "Inward entry saved and inventory updated",
      className: "bg-green-50 border-green-200",
    })
  }

  // Handle exporting data
  const handleExportData = () => {
    const dataStr = JSON.stringify({
      inventory,
      transactions,
      inwardEntries,
    })
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = "generic-aadhaar-data.json"
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  // Handle importing data
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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
          description: "Data imported successfully",
          className: "bg-green-50 border-green-200",
        })
      } catch (error) {
        console.error("Error importing data:", error)
        toast({
          title: "Error",
          description: "Failed to import data",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  // Configure Firebase
  const handleConfigureFirebase = () => {
    setShowFirebaseConfigDialog(true)
  }

  // Handle cycle audit
  const handleAuditItemCount = (count: number) => {
    const currentItem = auditItems[currentAuditIndex]

    // Save the audit result
    setAuditResults((prev) => [
      ...prev,
      {
        id: currentItem.id,
        expected: currentItem.stock,
        actual: count,
      },
    ])

    // Move to next item or complete audit
    if (currentAuditIndex < auditItems.length - 1) {
      setCurrentAuditIndex((prev) => prev + 1)
    } else {
      completeAudit()
    }
  }

  // Skip the audit
  const handleSkipAudit = () => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0]
      localStorage.setItem("ga-last-audit-date", today)
    }
    setShowCycleAudit(false)
  }

  // Complete the audit
  const completeAudit = () => {
    // Update inventory based on audit results
    const updatedInventory = [...inventory]

    auditResults.forEach((result) => {
      const itemIndex = updatedInventory.findIndex((item) => item.id === result.id)
      if (itemIndex !== -1) {
        updatedInventory[itemIndex] = {
          ...updatedInventory[itemIndex],
          stock: result.actual,
        }
      }
    })

    setInventory(updatedInventory)

    // Mark audit as completed
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0]
      localStorage.setItem("ga-last-audit-date", today)
    }

    setAuditCompleted(true)

    // Show toast
    toast({
      title: "Audit Completed",
      description: "Inventory has been updated based on your audit",
      className: "bg-green-50 border-green-200",
    })

    // Close dialog after 2 seconds
    setTimeout(() => {
      setShowCycleAudit(false)
      setAuditCompleted(false)
      setCurrentAuditIndex(0)
      setAuditResults([])
    }, 2000)
  }

  // Offline warning banner
  const OfflineBanner = () => {
    if (isOnline) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 rounded shadow-md"
      >
        <div className="flex items-center">
          <div className="py-1">
            <WifiOff className="h-6 w-6 text-amber-500 mr-4" />
          </div>
          <div>
            <p className="font-bold">You are currently offline</p>
            <p className="text-sm">Changes will be saved locally and synced when you reconnect to the internet.</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-100 min-h-screen text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <motion.h1
            className="text-3xl font-bold text-emerald-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            🧬 Generic Aadhaar - Pharmacy ERP
          </motion.h1>
          {user && (
            <motion.span
              className="ml-4 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{date}</span>
          {!isOnline && (
            <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs flex items-center">
              <WifiOff className="h-3 w-3 mr-1" /> Offline
            </span>
          )}
          {user && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchUser(user.role !== "admin" ? "admin" : "pharmacist")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Switch to {user.role === "admin" ? "Pharmacist" : "Admin"}
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </>
          )}
          {isAdmin() && (
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
        </div>
      </header>

      <OfflineBanner />

      {/* Main content */}
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
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStats}
              disabled={isRefreshingStats || !isOnline}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingStats ? "animate-spin" : ""}`} />
              {isRefreshingStats ? "Refreshing..." : "Refresh Dashboard"}
            </Button>
          </div>

          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-emerald-50 to-emerald-100">
                    <span className="text-emerald-600 text-lg font-semibold">Today's Sales</span>
                    <span className="text-2xl font-bold mt-2">₹{todaySales.toFixed(2)}</span>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-amber-50 to-amber-100">
                    <span className="text-amber-500 text-lg font-semibold">Low Stock Alerts</span>
                    <span className="text-2xl font-bold mt-2">{lowStockCount}</span>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-green-50 to-green-100">
                    <span className="text-green-500 text-lg font-semibold">Invoices Generated</span>
                    <span className="text-2xl font-bold mt-2">{todayInvoiceCount}</span>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Payment Methods Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-emerald-700">Payment Received Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
                    <div className="flex items-center">
                      <div className="p-2 bg-emerald-100 rounded-full mr-3">
                        <Banknote className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cash</p>
                        <p className="text-lg font-bold">₹{paymentStats.cash.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-full mr-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Card</p>
                        <p className="text-lg font-bold">₹{paymentStats.card.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-full mr-3">
                        <Smartphone className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">UPI</p>
                        <p className="text-lg font-bold">₹{paymentStats.upi.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 rounded-full mr-3">
                        <AlertCircle className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Other</p>
                        <p className="text-lg font-bold">₹{paymentStats.other.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center italic text-lg text-emerald-700"
          >
            "Great service begins with great health."
          </motion.div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <SimplifiedBilling
            inventory={inventory}
            onCreateInvoice={handleCreateInvoice}
            onUpdateInventory={handleUpdateInventory}
          />
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <SimplifiedInventory inventory={inventory} onUpdateInventory={handleUpdateInventory} />
        </TabsContent>

        {/* Inward */}
        <TabsContent value="inward">
          <EnhancedInwardWithCSV inventory={inventory} onSaveInward={handleSaveInward} />
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <SimplifiedReports transactions={transactions} inventory={inventory} inwardEntries={inwardEntries} />
        </TabsContent>

        {/* Sync */}
        <TabsContent value="sync">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Synchronization Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-semibold ${syncStatus === "synced" ? "text-green-600" : syncStatus === "syncing" ? "text-blue-600" : "text-amber-600"}`}
                    >
                      {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Synced:</span>
                    <span>{lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Device ID:</span>
                    <span className="font-mono text-sm">{deviceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connected Devices:</span>
                    <span>{inventorySyncInfo.connectedDevices.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network Status:</span>
                    <span className={isOnline ? "text-green-600" : "text-red-600"}>
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <Button onClick={() => setShowSyncDialog(true)} className="w-full mt-2" disabled={!isOnline}>
                    Manage Synchronization
                  </Button>
                  <Button onClick={handleConfigureFirebase} variant="outline" className="w-full mt-2">
                    Configure Firebase
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Inventory Items:</span>
                    <span>{inventory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transactions:</span>
                    <span>{transactions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inward Entries:</span>
                    <span>{inwardEntries.length}</span>
                  </div>
                  <Button onClick={handleExportData} className="w-full mt-2">
                    Export Data
                  </Button>
                  <div className="mt-2">
                    <label htmlFor="import-file" className="block mb-2 text-sm font-medium">
                      Import Data
                    </label>
                    <input
                      type="file"
                      id="import-file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sync Dialog */}
      <EnhancedSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        deviceId={deviceId}
        syncStatus={syncStatus}
        isOnline={isOnline}
        lastSyncTime={lastSyncTime}
        onSync={handleForceSync}
        onExport={handleExportData}
        onImport={handleImportFile}
        data={{ inventory, transactions, inwardEntries }}
        connectedDevices={inventorySyncInfo.connectedDevices}
      />

      {/* Firebase Config Dialog */}
      <FirebaseConfigDialog open={showFirebaseConfigDialog} onOpenChange={setShowFirebaseConfigDialog} />

      {/* Cycle Audit Dialog */}
      {showCycleAudit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Daily Inventory Audit</h2>
            {!auditCompleted ? (
              <>
                <p className="mb-4">
                  Please verify the current stock count for:
                  <span className="font-bold block mt-2">{auditItems[currentAuditIndex]?.name}</span>
                  <span className="text-sm text-gray-500 block">Batch: {auditItems[currentAuditIndex]?.batch}</span>
                </p>
                <p className="mb-4">
                  System shows: <span className="font-bold">{auditItems[currentAuditIndex]?.stock} units</span>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Actual Count:</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="border rounded p-2 w-full"
                      defaultValue={auditItems[currentAuditIndex]?.stock}
                      min={0}
                      id="audit-count"
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById("audit-count") as HTMLInputElement
                        const count = Number.parseInt(input.value)
                        if (!isNaN(count) && count >= 0) {
                          handleAuditItemCount(count)
                        }
                      }}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleSkipAudit}>
                    Skip Audit
                  </Button>
                  <div className="text-sm text-gray-500">
                    Item {currentAuditIndex + 1} of {auditItems.length}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-green-600 font-bold mb-2">Audit Completed!</p>
                <p>Thank you for verifying your inventory.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GenericAadhaarERP() {
  return (
    <AuthProvider>
      <ERPContent />
    </AuthProvider>
  )
}
