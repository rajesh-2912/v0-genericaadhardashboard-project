"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, WifiOff, User, CreditCard, Banknote, Smartphone, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// Import types
import type { InventoryItem, Transaction, InwardEntry } from "./types/erp-types"

// Import custom hooks
import { useInventorySync, useTransactionsSync, useInwardEntriesSync } from "./hooks/use-local-storage-sync"

// Import components
import { EnhancedSyncDialog } from "./components/enhanced-sync-dialog"
import FirebaseConfigDialog from "./components/firebase-config-dialog"
import SyncStatusPanel from "./components/sync-status-panel"
import { AuthProvider, useAuth } from "./contexts/auth-context"
import UserSwitcher from "./components/login-form"
import InventoryManagement from "./components/inventory-management"
import SimplifiedBilling from "./components/simplified-billing"
import SimplifiedInward from "./components/simplified-inward"
import SimplifiedReports from "./components/simplified-reports"

function ERPContent() {
  const { user, logout, isAdmin, switchUser } = useAuth()
  const date = new Date().toLocaleString()
  const [activeTab, setActiveTab] = useState("home")

  // State for data persistence with sync hooks
  const [inventory, setInventory, inventorySyncInfo] = useInventorySync([])
  const [transactions, setTransactions, transactionsSyncInfo] = useTransactionsSync([])
  const [inwardEntries, setInwardEntries, inwardEntriesSyncInfo] = useInwardEntriesSync([])

  // Cycle audit state
  const [showCycleAudit, setShowCycleAudit] = useState(false)
  const [auditItems, setAuditItems] = useState<InventoryItem[]>([])
  const [currentAuditIndex, setCurrentAuditIndex] = useState(0)
  const [auditResults, setAuditResults] = useState<{ id: string; expected: number; actual: number }[]>([])
  const [auditCompleted, setAuditCompleted] = useState(false)

  // Sync dialog state
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showFirebaseConfigDialog, setShowFirebaseConfigDialog] = useState(false)

  // Stats for dashboard
  const [todaySales, setTodaySales] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [todayInvoiceCount, setTodayInvoiceCount] = useState(0)

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
  useEffect(() => {
    if (typeof window === "undefined") return

    const today = new Date().toISOString().split("T")[0]
    const lastAuditDate = localStorage.getItem("ga-last-audit-date")

    if (lastAuditDate !== today && inventory.length > 0) {
      // Select 5 random items for audit or fewer if inventory has less items
      const itemCount = Math.min(5, inventory.length)
      const shuffled = [...inventory].sort(() => 0.5 - Math.random())
      const selected = shuffled.slice(0, itemCount)

      setAuditItems(selected)
      setShowCycleAudit(true)
    }
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
  }, [transactions, inventory])

  // Derive overall sync status
  const syncStatus = (() => {
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
    // This is a placeholder - in a real app, you would implement this
    return true
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
                  onClick={() => (user.role !== "admin" ? switchUser("admin") : switchUser("pharmacist"))}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
          <InventoryManagement />
        </TabsContent>

        {/* Inward */}
        <TabsContent value="inward">
          <SimplifiedInward onSave={handleSaveInward} />
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <SimplifiedReports transactions={transactions} />
        </TabsContent>

        {/* Sync */}
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

      {/* Dialogs */}
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
      <FirebaseConfigDialog open={showFirebaseConfigDialog} onOpenChange={setShowFirebaseConfigDialog} />

      {/* Cycle Audit Dialog */}
      <Dialog open={showCycleAudit} onOpenChange={setShowCycleAudit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Daily Inventory Cycle Audit</DialogTitle>
            <DialogDescription>
              {auditCompleted
                ? "Audit completed successfully! Inventory has been updated."
                : "Please verify the actual count of these items to ensure inventory accuracy."}
            </DialogDescription>
          </DialogHeader>

          {!auditCompleted && auditItems.length > 0 && currentAuditIndex < auditItems.length && (
            <div className="py-4">
              <div className="mb-4 p-4 bg-emerald-50 rounded-lg">
                <h3 className="font-medium text-lg text-emerald-700">{auditItems[currentAuditIndex].name}</h3>
                <p className="text-sm text-gray-500">Batch: {auditItems[currentAuditIndex].batch}</p>
                <p className="text-sm text-gray-500">Expiry: {auditItems[currentAuditIndex].expiry}</p>
                <p className="mt-2">
                  <span className="font-medium">System Count:</span> {auditItems[currentAuditIndex].stock}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="actual-count" className="text-sm font-medium">
                    Actual Count:
                  </label>
                  <input
                    type="number"
                    id="actual-count"
                    defaultValue={auditItems[currentAuditIndex].stock}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleSkipAudit}>
                    Skip Audit Today
                  </Button>
                  <Button
                    onClick={() => {
                      const input = document.getElementById("actual-count") as HTMLInputElement
                      handleAuditItemCount(Number.parseInt(input.value || "0", 10))
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {currentAuditIndex === auditItems.length - 1 ? "Complete Audit" : "Next Item"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {auditCompleted && (
            <div className="py-4 flex justify-center">
              <div className="animate-pulse p-3 rounded-full bg-emerald-100">
                <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function GenericAadhaarERP() {
  return (
    <AuthProvider>
      <AuthContent />
    </AuthProvider>
  )
}

function AuthContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <UserSwitcher />
  }

  return <ERPContent />
}
