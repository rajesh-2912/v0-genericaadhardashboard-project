"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Check, Settings } from "lucide-react"
import type { SyncStatus } from "../utils/reliable-sync-service"

interface SyncStatusPanelProps {
  syncStatus: SyncStatus
  lastSyncTime?: string
  isOnline: boolean
  connectedDevices: string[]
  deviceId: string
  onSync: () => Promise<boolean>
  hasValidApiKey: boolean
  onConfigureFirebase: () => void
}

export default function SyncStatusPanel({
  syncStatus,
  lastSyncTime,
  isOnline,
  connectedDevices,
  deviceId,
  onSync,
  hasValidApiKey,
  onConfigureFirebase,
}: SyncStatusPanelProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)
    try {
      await onSync()
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return "Never"

    try {
      const date = new Date(lastSyncTime)
      return date.toLocaleString()
    } catch (e) {
      return lastSyncTime
    }
  }

  const getStatusIcon = () => {
    if (syncStatus === "syncing" || isSyncing) {
      return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
    }
    if (syncStatus === "synced") {
      return <Check className="h-5 w-5 text-green-500" />
    }
    if (syncStatus === "offline" || !isOnline) {
      return <WifiOff className="h-5 w-5 text-amber-500" />
    }
    if (syncStatus === "error" || syncStatus === "no-api-key" || syncStatus === "auth-disabled") {
      return <AlertTriangle className="h-5 w-5 text-red-500" />
    }
    return <Wifi className="h-5 w-5 text-blue-500" />
  }

  const getStatusText = () => {
    if (syncStatus === "syncing" || isSyncing) {
      return "Syncing..."
    }
    if (syncStatus === "synced") {
      return "Synced"
    }
    if (syncStatus === "offline" || !isOnline) {
      return "Offline"
    }
    if (syncStatus === "no-api-key") {
      return "No API Key"
    }
    if (syncStatus === "auth-disabled") {
      return "Auth Disabled"
    }
    if (syncStatus === "error") {
      return "Sync Error"
    }
    return "Connected"
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Sync Status</span>
          <span className="flex items-center gap-2 text-sm font-normal">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Last synced:</span>
            <span>{formatLastSyncTime()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Device ID:</span>
            <span className="font-mono text-xs">{deviceId.substring(0, 12)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Connected devices:</span>
            <span>{connectedDevices.length}</span>
          </div>
        </div>

        {!hasValidApiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Firebase API key not configured</p>
                <p className="text-xs mt-1">Configure Firebase to enable real-time synchronization across devices.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing || !isOnline || !hasValidApiKey}
            className="w-full"
            size="sm"
          >
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

          <Button onClick={onConfigureFirebase} variant="outline" className="w-full" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure Firebase
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
