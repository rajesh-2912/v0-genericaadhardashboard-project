'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle2, RefreshCw, WifiOff, Smartphone, Laptop } from 'lucide-react'

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [lastSynced, setLastSynced] = useState<Date>(new Date())
  const [connectedDevices, setConnectedDevices] = useState(2)
  
  // Simulate status changes for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.random()
      
      if (random > 0.9) {
        setStatus('syncing')
        setTimeout(() => {
          setStatus('synced')
          setLastSynced(new Date())
        }, 2000)
      } else if (random < 0.05) {
        setStatus('offline')
        setTimeout(() => {
          setStatus('synced')
          setLastSynced(new Date())
        }, 5000)
      }
      
      // Randomly change connected devices count
      if (random > 0.8 && random < 0.85) {
        setConnectedDevices(prev => Math.min(prev + 1, 5))
      } else if (random > 0.85 && random < 0.9) {
        setConnectedDevices(prev => Math.max(prev - 1, 1))
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])
  
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    return `${diffHours} hours ago`
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`
              cursor-pointer
              ${status === 'synced' ? 'bg-green-50 text-green-700' : ''}
              ${status === 'syncing' ? 'bg-blue-50 text-blue-700' : ''}
              ${status === 'offline' ? 'bg-gray-100 text-gray-700' : ''}
              ${status === 'error' ? 'bg-red-50 text-red-700' : ''}
            `}
          >
            {status === 'synced' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {status === 'syncing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
            {status === 'offline' && <WifiOff className="h-3 w-3 mr-1" />}
            {status === 'error' && <WifiOff className="h-3 w-3 mr-1" />}
            
            {status === 'synced' && 'Synced'}
            {status === 'syncing' && 'Syncing...'}
            {status === 'offline' && 'Offline'}
            {status === 'error' && 'Error'}
            
            <div className="ml-1 flex items-center gap-1">
              <span className="text-xs">•</span>
              <Laptop className="h-3 w-3" />
              <span className="text-xs">{connectedDevices}</span>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Sync Status: {status.charAt(0).toUpperCase() + status.slice(1)}</p>
            <p>Last synced: {formatTime(lastSynced)}</p>
            <p>Connected devices: {connectedDevices}</p>
            <p className="italic">Click for detailed sync info</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
