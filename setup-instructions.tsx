"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Check, Copy, ExternalLink } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function SetupInstructions() {
  const [apiKey, setApiKey] = useState("")
  const [projectId, setProjectId] = useState("generic-aadhaar-erp")
  const [setupComplete, setSetupComplete] = useState(false)

  const handleCopyConfig = () => {
    const config = `
// Firebase configuration for real-time database
const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${projectId}.firebaseapp.com",
  databaseURL: "https://${projectId}-default-rtdb.firebaseio.com",
  projectId: "${projectId}",
  storageBucket: "${projectId}.appspot.com",
  messagingSenderId: "xxxxxxxxxxxx",
  appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx"
};
    `.trim()

    navigator.clipboard.writeText(config)
    toast({
      title: "Configuration copied",
      description: "Firebase configuration has been copied to clipboard",
    })
  }

  const handleSaveConfig = () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Firebase API key",
        variant: "destructive",
      })
      return
    }

    localStorage.setItem(
      "firebase-config",
      JSON.stringify({
        apiKey,
        projectId,
      }),
    )

    setSetupComplete(true)

    toast({
      title: "Configuration saved",
      description: "Firebase configuration has been saved",
    })
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Firebase Setup for Real-Time Sync</CardTitle>
          <CardDescription>Configure Firebase to enable real-time data synchronization across devices</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="new">
            <TabsList className="mb-4">
              <TabsTrigger value="new">New Firebase Project</TabsTrigger>
              <TabsTrigger value="existing">Existing Firebase Project</TabsTrigger>
            </TabsList>

            <TabsContent value="new">
              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Follow these steps</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>
                            Go to{" "}
                            <a
                              href="https://console.firebase.google.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline flex items-center"
                            >
                              Firebase Console <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </li>
                          <li>Click "Add project" and follow the setup wizard</li>
                          <li>Once created, click on the web icon ({"</>"}) to add a web app</li>
                          <li>Register your app with a name (e.g., "Generic Aadhaar ERP")</li>
                          <li>Copy the apiKey from the configuration</li>
                          <li>Go to "Build" → "Realtime Database" in the sidebar</li>
                          <li>Click "Create Database" and choose "Start in test mode"</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">Firebase API Key</Label>
                  <Input
                    id="api-key"
                    placeholder="AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Enter the API key from your Firebase project configuration</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-id">Firebase Project ID</Label>
                  <Input
                    id="project-id"
                    placeholder="generic-aadhaar-erp"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Enter your Firebase project ID</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="existing">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="existing-api-key">Firebase API Key</Label>
                  <Input
                    id="existing-api-key"
                    placeholder="AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="existing-project-id">Firebase Project ID</Label>
                  <Input
                    id="existing-project-id"
                    placeholder="generic-aadhaar-erp"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="config">Firebase Configuration</Label>
                  <Textarea
                    id="config"
                    className="font-mono text-xs h-32"
                    readOnly
                    value={`
// Firebase configuration for real-time database
const firebaseConfig = {
  apiKey: "${apiKey || "YOUR_API_KEY"}",
  authDomain: "${projectId || "YOUR_PROJECT_ID"}.firebaseapp.com",
  databaseURL: "https://${projectId || "YOUR_PROJECT_ID"}-default-rtdb.firebaseio.com",
  projectId: "${projectId || "YOUR_PROJECT_ID"}",
  storageBucket: "${projectId || "YOUR_PROJECT_ID"}.appspot.com",
  messagingSenderId: "xxxxxxxxxxxx",
  appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx"
};
                    `.trim()}
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button onClick={handleSaveConfig} disabled={!apiKey}>
            {setupComplete ? (
              <>
                <Check className="h-4 w-4 mr-2" /> Configuration Saved
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
