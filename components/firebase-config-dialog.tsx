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
import { useFirebaseConfig } from "../hooks/use-reliable-sync"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle } from "lucide-react"

interface FirebaseConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FirebaseConfigDialog({ open, onOpenChange }: FirebaseConfigDialogProps) {
  const [apiKey, setApiKey] = useState("")
  const [projectId, setProjectId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updateConfig, isValid] = useFirebaseConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const success = updateConfig(apiKey, projectId)

      if (success) {
        toast({
          title: "Firebase configuration updated",
          description: "Your Firebase configuration has been updated successfully.",
        })
        onOpenChange(false)
      } else {
        toast({
          title: "Error updating Firebase configuration",
          description: "Please check your API key and project ID.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating Firebase configuration:", error)
      toast({
        title: "Error updating Firebase configuration",
        description: "An unexpected error occurred.",
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
          <DialogTitle>Firebase Configuration</DialogTitle>
          <DialogDescription>
            Enter your Firebase API key and project ID to enable real-time synchronization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="col-span-4">
                Firebase API Key
              </Label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="col-span-4"
                placeholder="AIzaSyB..."
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectId" className="col-span-4">
                Firebase Project ID
              </Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="col-span-4"
                placeholder="your-project-id"
                required
              />
            </div>
            <div className="col-span-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                {isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                {isValid ? "Firebase configuration is valid." : "Firebase configuration is not set or invalid."}
              </p>
              <p className="mt-2">
                Note: If anonymous authentication is disabled in your Firebase project, the app will still work but with
                limited synchronization capabilities.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default FirebaseConfigDialog
