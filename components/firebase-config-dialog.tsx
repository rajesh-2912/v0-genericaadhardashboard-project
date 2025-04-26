"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import enhancedSyncService from "../utils/enhanced-sync-service"

interface FirebaseConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function FirebaseConfigDialog({ open, onOpenChange }: FirebaseConfigDialogProps) {
  const [apiKey, setApiKey] = useState("")
  const [projectId, setProjectId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiKey || !projectId) {
      toast({
        title: "Error",
        description: "Please provide both Firebase API Key and Project ID",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const success = enhancedSyncService.updateFirebaseConfig(apiKey, projectId)

      if (success) {
        toast({
          title: "Success",
          description: "Firebase configuration updated successfully",
        })
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: "Failed to update Firebase configuration. Please check your credentials.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating Firebase config:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Firebase</DialogTitle>
          <DialogDescription>Enter your Firebase credentials to enable cloud synchronization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="apiKey">Firebase API Key</Label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSyB..."
                required
              />
              <p className="text-xs text-muted-foreground">
                Found in Firebase Console under Project Settings &gt; General &gt; Web API Key
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectId">Firebase Project ID</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-project-id"
                required
              />
              <p className="text-xs text-muted-foreground">
                Found in Firebase Console under Project Settings &gt; General &gt; Project ID
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
