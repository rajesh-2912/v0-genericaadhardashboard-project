"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Cloud, Download, RefreshCw, Save, Upload, WifiOff } from "lucide-react"
import type { SyncStatus } from "../types/erp-types"
import { generateBackupCode, restoreFromBackupCode } from "../utils/sync-utils"

interface SyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: string
  syncStatus: SyncStatus
  isOnline: boolean
  lastSyncTime?: string
  onSync: () => Promise<boolean>
  onExport?: () => void
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onGenerateBackupCode?: () => string
  onRestoreFromBackupCode?: (code: string) => boolean
  data: {
    inventory: any[]
    transactions: any[]
    inwardEntries: any[]
  }
}

export default function SyncDialog({
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
}: SyncDialogProps) {
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [restoreCode, setRestoreCode] = useState("")
  const [restoreError, setRestoreError] = useState("")
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  const handleGenerateBackupCode = () => {
    setIsGeneratingCode(true)

    try {
      const code = generateBackupCode(data)
      setBackupCode(code)
      setIsGeneratingCode(false)
    } catch (error) {
      console.error("Error generating backup code:", error)
      setIsGeneratingCode(false)
    }
  }

  const handleRestoreFromBackupCode = () => {
    setRestoreError("")
    setRestoreSuccess(false)

    if (!restoreCode) {
      setRestoreError("Please enter a backup code")
      return
    }

    try {
      const restoredData = restoreFromBackupCode(restoreCode)

      if (!restoredData) {
        setRestoreError("Invalid backup code or data not found")
        return
      }

      // Trigger data import in parent component
      if (onImport) {
        const event = new CustomEvent("backupRestore", { detail: restoredData })
        document.dispatchEvent(event)
        setRestoreSuccess(true)
      }
    } catch (error) {
      console.error("Error restoring from backup code:", error)
      setRestoreError("Failed to restore data from backup code")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data Synchronization</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cloud">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="cloud">Cloud Sync</TabsTrigger>
            <TabsTrigger value="backup">Backup Code</TabsTrigger>
          </TabsList>

          <TabsContent value="cloud" className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
              <div>
                {isOnline ? (
                  syncStatus === "synced" ? (
                    <Cloud className="h-5 w-5 text-green-500" />
                  ) : syncStatus === "syncing" ? (
                    <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />
                  ) : (
                    <Cloud className="h-5 w-5 text-gray-400" />
                  )
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isOnline
                    ? syncStatus === "synced"
                      ? "Data is synced with cloud"
                      : syncStatus === "syncing"
                        ? "Syncing data with cloud..."
                        : "Data not synced with cloud"
                    : "You are offline"}
                </p>
                <p className="text-xs text-gray-500">
                  {lastSyncTime ? `Last sync: ${new Date(lastSyncTime).toLocaleString()}` : "Never synced"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Device ID</Label>
              <div className="flex items-center gap-2">
                <Input value={deviceId} readOnly className="font-mono text-sm" />
              </div>
              <p className="text-xs text-gray-500">This is your unique device identifier for synchronization.</p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onSync} disabled={!isOnline || syncStatus === "syncing"}>
                {syncStatus === "syncing" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Sync Now
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" /> Export Data
                </Button>
                <div className="relative">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" /> Import Data
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImport}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Backup Code Sync</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Generate a backup code to transfer data between devices without cloud sync. The code is valid for
                      24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Generate Backup Code</h3>
              <p className="text-sm text-gray-500">Generate a code to transfer your data to another device.</p>
              <div className="flex gap-2">
                <Button onClick={handleGenerateBackupCode} disabled={isGeneratingCode} className="flex-1">
                  {isGeneratingCode ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Generate Code
                    </>
                  )}
                </Button>
              </div>

              {backupCode && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-gray-500 mb-1">Share this code with your other device:</p>
                  <p className="text-xl font-mono font-bold text-center">{backupCode}</p>
                  <p className="text-xs text-gray-500 mt-1">This code will work for 24 hours.</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <h3 className="font-medium">Restore from Backup Code</h3>
              <p className="text-sm text-gray-500">Enter a backup code from another device to import data.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter backup code"
                  value={restoreCode}
                  onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
                  className="flex-1"
                  maxLength={6}
                />
                <Button onClick={handleRestoreFromBackupCode}>
                  <Download className="h-4 w-4 mr-2" /> Restore
                </Button>
              </div>

              {restoreError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{restoreError}</p>
                </div>
              )}

              {restoreSuccess && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    Data restored successfully! Please refresh the page to see the changes.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
