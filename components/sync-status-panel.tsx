"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Laptop,
  Loader2,
  RefreshCw,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
} from "lucide-react"
import type { SyncStatus } from "../utils/enhanced-sync-service"

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
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [peerCode, setPeerCode] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [deviceName, setDeviceName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("device-name") || "This Device"
    }
    return "This Device"
  })
  const [isEditingName, setIsEditingName] = useState(false)

  // Save device name to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("device-name", deviceName)
    }
  }, [deviceName])

  // Handle sync button click
  const handleSync = async () => {
    if (isSyncing) return

    setIsSyncing(true)
    try {
      const success = await onSync()

      if (success) {
        toast({
          title: "Sync Complete",
          description: "Your data has been synchronized successfully",
        })
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to synchronize data. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing:", error)
      toast({
        title: "Sync Error",
        description: "An error occurred during synchronization",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Handle connect to peer
  const handleConnectToPeer = () => {
    // This would be implemented with actual P2P connection logic
    toast({
      title: "Connecting to Peer",
      description: `Attempting to connect to device with code: ${peerCode}`,
    })

    // Simulate connection
    setTimeout(() => {
      toast({
        title: "Connected",
        description: "Successfully connected to peer device",
      })
      setShowConnectDialog(false)
    }, 2000)
  }

  // Handle copy device ID
  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId)
    toast({
      title: "Copied",
      description: "Device ID copied to clipboard",
    })
  }

  // Get status icon and color
  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-5 w-5 text-gray-500" />
    if (!hasValidApiKey) return <AlertCircle className="h-5 w-5 text-amber-500" />

    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case "synced":
        return <Cloud className="h-5 w-5 text-green-500" />
      case "local":
        return <Cloud className="h-5 w-5 text-amber-500" />
      case "offline":
        return <CloudOff className="h-5 w-5 text-gray-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "connected":
        return <Wifi className="h-5 w-5 text-green-500" />
      case "disconnected":
        return <WifiOff className="h-5 w-5 text-gray-500" />
      case "no-api-key":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Cloud className="h-5 w-5" />
    }
  }

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return "Offline"
    if (!hasValidApiKey) return "Firebase Not Configured"

    switch (syncStatus) {
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

  // Format time
  const formatTime = (timeString?: string) => {
    if (!timeString) return "Never"

    try {
      const date = new Date(timeString)
      return date.toLocaleString()
    } catch (error) {
      return timeString
    }
  }

  // Get device icon based on user agent
  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase()

    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-4 w-4" />
    } else if (ua.includes("ipad") || ua.includes("tablet")) {
      return <Tablet className="h-4 w-4" />
    } else {
      return <Laptop className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-gray-100">{getStatusIcon()}</div>
            <div>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>
                {getStatusText()} • Last synced: {formatTime(lastSyncTime)}
              </CardDescription>
            </div>
          </div>

          <Badge variant={isOnline ? "default" : "outline"} className={isOnline ? "bg-green-500" : "text-gray-500"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Device ID:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{deviceId.substring(0, 8)}...</span>
                  <Button variant="ghost" size="icon" onClick={handleCopyDeviceId}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Network Status:</span>
                <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Sync Status:</span>
                <span className="text-sm">{getStatusText()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Last Synced:</span>
                <span className="text-sm">{formatTime(lastSyncTime)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Connected Devices:</span>
                <span className="text-sm">{connectedDevices.length}</span>
              </div>
            </div>

            {!hasValidApiKey ? (
              <div className="rounded-md bg-amber-50 p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-800">Firebase Not Configured</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Configure Firebase to enable real-time synchronization across devices.
                    </p>
                    <Button size="sm" className="mt-2 bg-amber-500 hover:bg-amber-600" onClick={onConfigureFirebase}>
                      Configure Firebase
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button onClick={handleSync} disabled={!isOnline || isSyncing || !hasValidApiKey} className="w-full">
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" /> Sync Now
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConnectDialog(true)}
                    disabled={!isOnline || !hasValidApiKey}
                  >
                    Connect to Device
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(true)}
                    disabled={!isOnline || !hasValidApiKey}
                  >
                    Share Device ID
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Connected Devices</h3>
              <Badge>{connectedDevices.length + 1}</Badge>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Current device */}
                  <TableRow className="bg-blue-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-blue-500" />
                        <div>
                          {isEditingName ? (
                            <Input
                              value={deviceName}
                              onChange={(e) => setDeviceName(e.target.value)}
                              onBlur={() => setIsEditingName(false)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setIsEditingName(false)
                              }}
                              className="h-7 py-1"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="font-medium cursor-pointer hover:underline"
                              onClick={() => setIsEditingName(true)}
                            >
                              {deviceName} (This Device)
                            </span>
                          )}
                          <p className="text-xs text-gray-500">{deviceId.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>Now</TableCell>
                  </TableRow>

                  {/* Connected devices */}
                  {connectedDevices.map((device, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(navigator.userAgent)}
                          <div>
                            <span className="font-medium">Device {index + 1}</span>
                            <p className="text-xs text-gray-500">{device.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Connected
                        </Badge>
                      </TableCell>
                      <TableCell>Just now</TableCell>
                    </TableRow>
                  ))}

                  {connectedDevices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        No other devices connected
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setShowConnectDialog(true)}
                disabled={!isOnline || !hasValidApiKey}
              >
                Connect to Another Device
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Device Name</h3>
                <div className="flex gap-2">
                  <Input
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Enter device name"
                  />
                  <Button variant="outline" onClick={() => toast({ title: "Device name saved" })}>
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Firebase Configuration</h3>
                {hasValidApiKey ? (
                  <div className="rounded-md bg-green-50 p-3">
                    <div className="flex">
                      <Check className="h-5 w-5 text-green-400 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Firebase Configured</h3>
                        <p className="text-sm text-green-700 mt-1">Your Firebase configuration is set up correctly.</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={onConfigureFirebase}>
                          Update Configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-amber-50 p-3">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-amber-400 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-amber-800">Firebase Not Configured</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          Configure Firebase to enable real-time synchronization across devices.
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 bg-amber-500 hover:bg-amber-600"
                          onClick={onConfigureFirebase}
                        >
                          Configure Firebase
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Sync Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-sync">Auto-sync when online</Label>
                    <input type="checkbox" id="auto-sync" defaultChecked className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-interval">Sync interval (minutes)</Label>
                    <Input id="sync-interval" type="number" defaultValue="5" className="w-20 text-right" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to Device</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="peer-code">Enter Device ID or Code</Label>
              <Input
                id="peer-code"
                value={peerCode}
                onChange={(e) => setPeerCode(e.target.value)}
                placeholder="Enter device ID or code"
              />
            </div>

            <div className="rounded-md bg-blue-50 p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
                <div>
                  <p className="text-sm text-blue-700">
                    Ask the other device user to share their Device ID, then enter it here to connect.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnectToPeer} disabled={!peerCode}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Device ID</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Device ID</Label>
              <div className="flex gap-2">
                <Input value={deviceId} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopyDeviceId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Share this ID with other users to allow them to connect to your device.
              </p>
            </div>

            <div className="rounded-md bg-blue-50 p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
                <div>
                  <p className="text-sm text-blue-700">
                    Both devices must be online and have Firebase configured correctly for the connection to work.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
