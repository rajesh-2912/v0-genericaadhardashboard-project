"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { useInventorySync, useTransactionsSync, useInwardEntriesSync } from "./hooks/use-supabase-sync"
import { EnhancedSyncDialog } from "./components/enhanced-sync-dialog"
import FirebaseConfigDialog from "./components/firebase-config-dialog"
import SyncStatusPanel from "./components/sync-status-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { v4 as uuidv4 } from "uuid"
import { AuthProvider, useAuth } from "./contexts/auth-context"
import LoginForm from "./components/login-form"
import InventoryManagement from "./components/inventory-management"
import type { InventoryItem, Transaction, InwardEntry } from "./types/erp-types"
import SimplifiedBilling from "./components/simplified-billing"
import SimplifiedInward from "./components/simplified-inward"
import SimplifiedReports from "./components/simplified-reports"
import { LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

function ERPContent() {
  const { user, logout, isAdmin } = useAuth()
  const date = new Date().toLocaleString()
  const [activeTab, setActiveTab] = useState("home")

  // State for data persistence with Supabase sync
  const [inventory, setInventory, inventorySyncInfo] = useInventorySync([])
  const [transactions, setTransactions, transactionsSyncInfo] = useTransactionsSync([])
  const [inwardEntries, setInwardEntries, inwardEntriesSyncInfo] = useInwardEntriesSync([])

  // Sync dialog state
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showFirebaseConfigDialog, setShowFirebaseConfigDialog] = useState(false)

  // Stats for dashboard
  const [todaySales, setTodaySales] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [todayInvoiceCount, setTodayInvoiceCount] = useState(0)

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
    const todaySalesTotal = transactions
      .filter((transaction) => transaction.date === today)
      .reduce((sum, transaction) => sum + transaction.total, 0)
    setTodaySales(todaySalesTotal)

    // Calculate today's invoice count
    const todayInvoices = transactions.filter((transaction) => transaction.date === today).length
    setTodayInvoiceCount(todayInvoices)

    // Calculate low stock count
    const lowStockItems = inventory.filter((item) => item.stock <= 10).length
    setLowStockCount(lowStockItems)
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
            <svg
              className="h-6 w-6 text-amber-500 mr-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
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
    <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-100 min-h-screen text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <motion.h1
            className="text-3xl font-bold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            🧬 Generic Aadhaar - Pharmacy ERP
          </motion.h1>
          {user && (
            <motion.span
              className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
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
          {user && (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
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
                  <CardContent className="p-4 flex flex-col items-center justify-center h-32 bg-gradient-to-r from-blue-50 to-blue-100">
                    <span className="text-blue-500 text-lg font-semibold">Today's Sales</span>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center italic text-lg text-blue-700"
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <ERPContent />
}
