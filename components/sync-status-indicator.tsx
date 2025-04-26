"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CloudOff, CloudIcon as CloudSync, Cloud, AlertCircle, Wifi, WifiOff, Settings } from "lucide-react"
import type { SyncStatus } from "../utils/enhanced-sync-service"

interface SyncStatusIndicatorProps {
  status: SyncStatus
  lastSyncTime?: string
  isOnline: boolean
  connectedDevices: string[]
  onSync: () => Promise<boolean>
  hasValidApiKey: boolean
  onConfigureFirebase: () => void
}

export default function SyncStatusIndicator({
  status,
  lastSyncTime,
  isOnline,
  connectedDevices,
  onSync,
  hasValidApiKey,
  onConfigureFirebase,
}: SyncStatusIndicatorProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await onSync()
    } catch (error) {
      console.error("Error syncing:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-gray-500" />
    if (!hasValidApiKey) return <Settings className="h-4 w-4 text-amber-500" />

    switch (status) {
      case "syncing":
        return <CloudSync className="h-4 w-4 text-blue-500 animate-spin" />
      case "synced":
        return <Cloud className="h-4 w-4 text-green-500" />
      case "local":
        return <Cloud className="h-4 w-4 text-amber-500" />
      case "offline":
        return <CloudOff className="h-4 w-4 text-gray-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "connected":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-gray-500" />
      case "no-api-key":
        return <Settings className="h-4 w-4 text-amber-500" />
      default:
        return <Cloud className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    if (!isOnline) return "Offline"
    if (!hasValidApiKey) return "Firebase Not Configured"

    switch (status) {
      case "syncing":
        return "Syncing..."
      case "synced":
        return "Synced"
      case "local":
        return "Local Changes"
      case "offline":
        return "Offline"
      case "error":
        return "Sync Error"
      case "connected":
        return "Connected"
      case "disconnected":
        return "Disconnected"
      case "no-api-key":
        return "Firebase Not Configured"
      default:
        return "Unknown"
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "Never"

    try {
      const date = new Date(timeString)
      return date.toLocaleString()
    } catch (error) {
      return timeString
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSync}
            disabled={isSyncing || !isOnline || !hasValidApiKey}
          >
            {getStatusIcon()}
            <span className="sr-only">{getStatusText()}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="w-80 p-4">
          <div className="space-y-2">
            <p className="font-semibold">Sync Status: {getStatusText()}</p>
            <p className="text-sm">Last synced: {formatTime(lastSyncTime)}</p>

            {!hasValidApiKey && (
              <div className="mt-2">
                <p className="text-sm text-amber-600 mb-2">Firebase is not configured. Cloud sync is unavailable.</p>
                <Button size="sm" onClick={onConfigureFirebase} className="w-full">
                  Configure Firebase
                </Button>
              </div>
            )}

            {hasValidApiKey && connectedDevices.length > 0 && (
              <div>
                <p className="text-sm font-medium">Connected Devices:</p>
                <ul className="text-xs list-disc list-inside">
                  {connectedDevices.map((device, index) => (
                    <li key={index}>{device}</li>
                  ))}
                </ul>
              </div>
            )}

            {hasValidApiKey && isOnline && (
              <Button size="sm" onClick={handleSync} disabled={isSyncing} className="w-full">
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
