"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { AlertCircle, Check, Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react"
import type { SyncStatus } from "../types/erp-types"

interface SyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: string
  syncStatus: SyncStatus
  connectedPeers: string[]
  onConnect: (peerId: string) => Promise<boolean>
  onSync: () => Promise<boolean>
  isOnline: boolean
  lastSyncTime?: string
}

export default function SyncDialog({
  open,
  onOpenChange,
  deviceId,
  syncStatus,
  connectedPeers,
  onConnect,
  onSync,
  isOnline,
  lastSyncTime,
}: SyncDialogProps) {
  const [peerCode, setPeerCode] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleConnect = async () => {
    if (!peerCode) return

    setIsConnecting(true)
    try {
      await onConnect(peerCode)
      setPeerCode("")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await onSync()
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data Synchronization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Sync Status</h3>
              {isOnline ? (
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  <WifiOff className="h-3 w-3 mr-1" /> Offline
                </Badge>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm mb-1">Your Device ID:</p>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded">{deviceId}</p>
              <p className="text-xs text-gray-500 mt-1">Share this ID with others to connect</p>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <span>Status</span>
                <Badge variant={syncStatus === "synced" ? "outline" : "secondary"}>
                  {syncStatus === "syncing" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                  {syncStatus === "synced" && <Check className="h-3 w-3 mr-1" />}
                  {syncStatus === "local" && <CloudOff className="h-3 w-3 mr-1" />}
                  {syncStatus === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
                  {syncStatus === "offline" && <WifiOff className="h-3 w-3 mr-1" />}
                  {syncStatus === "connected" && <Cloud className="h-3 w-3 mr-1" />}
                  {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
                </Badge>
              </div>
            </div>

            {lastSyncTime && (
              <div className="mt-2 text-sm text-gray-500">Last synced: {new Date(lastSyncTime).toLocaleString()}</div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <h3 className="font-medium">Connect to Another Device</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter device ID"
                value={peerCode}
                onChange={(e) => setPeerCode(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleConnect}
                disabled={!peerCode || isConnecting || !isOnline}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                Connect
              </Button>
            </div>
          </div>

          {connectedPeers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Connected Devices</h3>
              <div className="space-y-1">
                {connectedPeers.map((peer) => (
                  <div key={peer} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                    <Cloud className="h-3 w-3 text-green-500" />
                    <span className="font-mono">{peer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 space-y-2">
            <Button
              onClick={handleSync}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              disabled={isSyncing || !isOnline}
            >
              {isSyncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
