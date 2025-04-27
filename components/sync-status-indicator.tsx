"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CloudOff, CloudIcon as CloudSync, Cloud, AlertCircle, Wifi, WifiOff, Settings, Lock } from "lucide-react"
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

    // Add badge for connected devices
    const iconWrapper = (icon: React.ReactNode) => (
      <div className="relative">
        {icon}
        {connectedDevices.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 text-[8px] text-white font-bold flex items-center justify-center">
              {connectedDevices.length}
            </span>
          </span>
        )}
      </div>
    )

    switch (status) {
      case "syncing":
        return iconWrapper(<CloudSync className="h-4 w-4 text-blue-500 animate-spin" />)
      case "synced":
        return iconWrapper(<Cloud className="h-4 w-4 text-green-500" />)
      case "local":
        return iconWrapper(<Cloud className="h-4 w-4 text-amber-500" />)
      case "offline":
        return iconWrapper(<CloudOff className="h-4 w-4 text-gray-500" />)
      case "error":
        return iconWrapper(<AlertCircle className="h-4 w-4 text-red-500" />)
      case "connected":
        return iconWrapper(<Wifi className="h-4 w-4 text-green-500" />)
      case "disconnected":
        return iconWrapper(<WifiOff className="h-4 w-4 text-gray-500" />)
      case "no-api-key":
        return iconWrapper(<Settings className="h-4 w-4 text-amber-500" />)
      case "auth-disabled":
        return iconWrapper(<Lock className="h-4 w-4 text-amber-500" />)
      default:
        return iconWrapper(<Cloud className="h-4 w-4" />)
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
      case "auth-disabled":
        return "Auth Disabled"
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
            disabled={isSyncing || !isOnline || !hasValidApiKey || status === "auth-disabled"}
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

            {status === "auth-disabled" && (
              <div className="mt-2">
                <p className="text-sm text-amber-600 mb-2">
                  Anonymous authentication is disabled for this Firebase project. Cloud sync is unavailable.
                </p>
                <p className="text-xs text-gray-500">
                  To enable cloud sync, enable Anonymous Authentication in your Firebase Authentication settings.
                </p>
              </div>
            )}

            {hasValidApiKey && isOnline && status !== "auth-disabled" && (
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
