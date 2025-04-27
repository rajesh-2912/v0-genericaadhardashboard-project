'use client'

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Smartphone, Laptop, Tablet, Wifi, WifiOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Device {
  id: string
  name: string
  type: 'mobile' | 'tablet' | 'desktop'
  lastSynced: Date
  status: 'online' | 'offline' | 'syncing'
  ipAddress: string
}

export function SyncStatusPanel() {
  const { toast } = useToast()
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'Main Counter',
      type: 'desktop',
      lastSynced: new Date(),
      status: 'online',
      ipAddress: '192.168.1.100'
    },
    {
      id: '2',
      name: 'Manager Phone',
      type: 'mobile',
      lastSynced: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      status: 'online',
      ipAddress: '192.168.1.101'
    },
    {
      id: '3',
      name: 'Inventory Tablet',
      type: 'tablet',
      lastSynced: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      status: 'offline',
      ipAddress: '192.168.1.102'
    }
  ])
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date())
  const [isOnline, setIsOnline] = useState(true)
  
  // Simulate sync process
  const handleSync = () => {
    setSyncStatus('syncing')
    
    setTimeout(() => {
      setSyncStatus('idle')
      setLastSyncTime(new Date())
      
      // Update devices
      setDevices(prev => prev.map(device => ({
        ...device,
        lastSynced: device.status === 'online' ? new Date() : device.lastSynced
      })))
      
      toast({
        title: "Sync Complete",
        description: "All online devices have been synchronized"
      })
    }, 2000)
  }
  
  // Format time difference
  const formatTimeDiff = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    
    if (diff < 60) return `${diff} seconds ago`
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    return `${Math.floor(diff / 86400)} days ago`
  }
  
  // Get device icon
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Laptop className="h-4 w-4" />
    }
  }
  
  // Simulate network status changes
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly toggle online status (for demo purposes)
      if (Math.random() > 0.95) {
        setIsOnline(prev => !prev)
        
        toast({
          title: isOnline ? "Connection Lost" : "Connection Restored",
          description: isOnline 
            ? "Working in offline mode. Changes will sync when connection is restored." 
            : "Your device is now connected. Syncing changes...",
          variant: isOnline ? "destructive" : "default"
        })
        
        if (!isOnline) {
          handleSync()
        }
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [isOnline])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Multi-Device Sync Status</CardTitle>
            <CardDescription>Real-time synchronization across devices</CardDescription>
          </div>
          <Badge 
            variant={isOnline ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={
                  syncStatus === 'idle' ? "bg-green-50" : 
                  syncStatus === 'syncing' ? "bg-blue-50" : 
                  "bg-red-50"
                }
              >
                {syncStatus === 'idle' && <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />}
                {syncStatus === 'syncing' && <RefreshCw className="h-3 w-3 text-blue-500 mr-1 animate-spin" />}
                {syncStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-500 mr-1" />}
                {syncStatus === 'idle' ? 'All Synced' : 
                 syncStatus === 'syncing' ? 'Syncing...' : 
                 'Sync Error'}
              </Badge>
              
              {lastSyncTime && (
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Last synced: {formatTimeDiff(lastSyncTime)}
                </span>
              )}
            </div>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSync}
              disabled={syncStatus === 'syncing' || !isOnline}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map(device => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.type)}
                      <span>{device.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        device.status === 'online' ? "default" : 
                        device.status === 'syncing' ? "outline" : 
                        "secondary"
                      }
                      className={
                        device.status === 'online' ? "bg-green-50 text-green-700" : 
                        device.status === 'syncing' ? "bg-blue-50 text-blue-700" : 
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {device.status === 'online' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {device.status === 'syncing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                      {device.status === 'offline' && <WifiOff className="h-3 w-3 mr-1" />}
                      {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTimeDiff(device.lastSynced)}</TableCell>
                  <TableCell>{device.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        <p>Changes are automatically synchronized across all connected devices</p>
      </CardFooter>
    </Card>
  )
}
