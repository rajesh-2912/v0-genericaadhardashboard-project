"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { useInventorySync, useTransactionsSync, useInwardEntriesSync } from "./hooks/use-supabase-sync"
import SyncStatusIndicator from "./components/sync-status-indicator"
import { Button } from "@/components/ui/button"
import { EnhancedSyncDialog } from "./components/enhanced-sync-dialog"
import FirebaseConfigDialog from "./components/firebase-config-dialog"
import SyncStatusPanel from "./components/sync-status-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { v4 as uuidv4 } from "uuid"
import type { InventoryItem, Transaction, InwardEntry } from "./types/erp-types"
import SimplifiedBilling from "./components/simplified-billing"
import SimplifiedInventory from "./components/simplified-inventory"
import SimplifiedInward from "./components/simplified-inward"
import SimplifiedReports from "./components/simplified-reports"

export default function GenericAadhaarERP() {
  const date = new Date().toLocaleString()
  const [activeTab, setActiveTab] = useState("home")

  // State for data persistence with Supabase sync
  const [inventory, setInventory, inventorySyncInfo] = useInventorySync([])
  const [transactions, setTransactions, transactionsSyncInfo] = useTransactionsSync([])
  const [inwardEntries, setInwardEntries, inwardEntriesSyncInfo] = useInwardEntriesSync([])

  // Sync dialog state
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showFirebaseConfigDialog, setShowFirebaseConfigDialog] = useState(false)

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

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

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
    setTransactions([invoice, ...transactions])

    toast({
      title: "Success",
      description: "Invoice created successfully",
    })
  }

  // Handle updating inventory
  const handleUpdateInventory = (updatedInventory: InventoryItem[]) => {
    setInventory(updatedInventory)
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
          <SimplifiedBilling
            inventory={inventory}
            onCreateInvoice={handleCreateInvoice}
            onUpdateInventory={handleUpdateInventory}
          />
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <SimplifiedInventory inventory={inventory} />
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
