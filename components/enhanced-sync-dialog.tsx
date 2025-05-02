"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Download, Upload, Share2 } from "lucide-react"
import type { SyncStatus } from "../utils/reliable-sync-service"

interface EnhancedSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: string
  syncStatus: SyncStatus
  isOnline: boolean
  lastSyncTime?: string
  onSync: () => Promise<boolean>
  onExport: () => void
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void
  data: any
  connectedDevices: string[]
}

function EnhancedSyncDialogComponent({
  open,
  onOpenChange,
  deviceId,
  syncStatus,
  isOnline,
  lastSyncTime,
  onSync,
  onExport,
  onImport,
  data,
  connectedDevices,
}: EnhancedSyncDialogProps) {
  const [activeTab, setActiveTab] = useState("status")
  const [isSyncing, setIsSyncing] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [restoreCode, setRestoreCode] = useState("")

  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      await onSync()
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, onSync])

  const generateBackupCode = useCallback(() => {
    try {
      const jsonData = JSON.stringify(data)
      const base64Data = btoa(jsonData)
      setBackupCode(base64Data)
    } catch (error) {
      console.error("Error generating backup code:", error)
      setBackupCode("Error generating backup code")
    }
  }, [data])

  const handleRestoreFromCode = useCallback(() => {
    if (!restoreCode) return

    try {
      const jsonData = atob(restoreCode)
      const parsedData = JSON.parse(jsonData)

      // Dispatch a custom event to handle the restore
      const event = new CustomEvent("backupRestore", { detail: parsedData })
      document.dispatchEvent(event)

      setRestoreCode("")
    } catch (error) {
      console.error("Error restoring from backup code:", error)
      alert("Invalid backup code. Please check and try again.")
    }
  }, [restoreCode])

  const formatLastSyncTime = useCallback(() => {
    if (!lastSyncTime) return "Never"

    try {
      const date = new Date(lastSyncTime)
      return date.toLocaleString()
    } catch (e) {
      return lastSyncTime
    }
  }, [lastSyncTime])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data Synchronization</DialogTitle>
          <DialogDescription>Sync your data across multiple devices</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Device ID:</span>
                <span className="font-mono text-sm">{deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span>{syncStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
              <div className="flex justify-between">
                <span>Last synced:</span>
                <span>{formatLastSyncTime()}</span>
              </div>
            </div>

            {connectedDevices.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Connected devices:</h3>
                <ul className="list-disc pl-4">
                  {connectedDevices.map((device, index) => (
                    <li key={index}>{device}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleSync} disabled={!isOnline || isSyncing} className="w-full">
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Export Data</h3>
              <p className="text-sm text-gray-500">
                Download your data as a file or generate a backup code to transfer to another device.
              </p>

              <div className="flex gap-2">
                <Button onClick={onExport} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export to File
                </Button>
                <Button onClick={generateBackupCode} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Generate Code
                </Button>
              </div>

              {backupCode && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Backup Code:</label>
                  <Textarea
                    value={backupCode}
                    readOnly
                    className="font-mono text-xs h-24"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Copy this code and paste it on another device to restore your data.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Import from File</h3>
              <p className="text-sm text-gray-500">Import data from a previously exported file.</p>

              <Input type="file" onChange={onImport} accept=".json" />
            </div>

            <div className="space-y-2 mt-4">
              <h3 className="font-semibold">Restore from Code</h3>
              <p className="text-sm text-gray-500">Paste a backup code to restore your data.</p>

              <Textarea
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value)}
                placeholder="Paste backup code here..."
                className="font-mono text-xs h-24"
              />

              <Button onClick={handleRestoreFromCode} disabled={!restoreCode} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Restore from Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const EnhancedSyncDialog = memo(EnhancedSyncDialogComponent)
export default EnhancedSyncDialog
