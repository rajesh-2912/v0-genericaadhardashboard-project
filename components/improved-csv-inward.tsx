"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileTextIcon, UploadIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { InwardEntry, InwardItem, InventoryItem } from "../types/erp-types"

interface CSVInwardProps {
  onAddToInventory: (items: InventoryItem[]) => void
  onSaveInwardEntry: (entry: InwardEntry) => void
  existingInventory: InventoryItem[]
}

interface ParsedInwardItem {
  name: string
  batch: string
  expiry: string
  quantity: number
  purchasePrice: number
  price: number
  gstRate: number
  valid: boolean
  error?: string
}

export default function ImprovedCSVInward({ onAddToInventory, onSaveInwardEntry, existingInventory }: CSVInwardProps) {
  const [csvData, setCsvData] = useState<string>("")
  const [parsedItems, setParsedItems] = useState<ParsedInwardItem[]>([])
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [supplier, setSupplier] = useState<string>("")
  const [invoiceNo, setInvoiceNo] = useState<string>("")
  const [paymentStatus, setPaymentStatus] = useState<string>("Pending")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvData(content)
      setVerificationStatus("idle")
      setParsedItems([])
    }
    reader.readAsText(file)
  }

  const parseCSV = useCallback(() => {
    setVerificationStatus("verifying")
    setErrorMessage("")

    try {
      // Basic CSV parsing
      const lines = csvData.split("\n").filter((line) => line.trim() !== "")
      const headers = lines[0].split(",").map((header) => header.trim().toLowerCase())

      // Check required headers
      const requiredHeaders = ["name", "batch", "expiry", "quantity", "purchase price", "price", "gst"]
      const missingHeaders = requiredHeaders.filter((header) => !headers.some((h) => h.includes(header.toLowerCase())))

      if (missingHeaders.length > 0) {
        setVerificationStatus("error")
        setErrorMessage(`Missing required headers: ${missingHeaders.join(", ")}`)
        return
      }

      // Find column indices
      const nameIndex = headers.findIndex((h) => h.includes("name") || h.includes("product") || h.includes("item"))
      const batchIndex = headers.findIndex((h) => h.includes("batch"))
      const expiryIndex = headers.findIndex((h) => h.includes("expiry") || h.includes("expiration"))
      const quantityIndex = headers.findIndex((h) => h.includes("quantity") || h.includes("qty") || h.includes("stock"))
      const purchasePriceIndex = headers.findIndex(
        (h) => h.includes("purchase") || h.includes("cost") || h.includes("buy"),
      )
      const priceIndex = headers.findIndex((h) => h.includes("price") || h.includes("mrp") || h.includes("sell"))
      const gstIndex = headers.findIndex((h) => h.includes("gst") || h.includes("tax") || h.includes("vat"))

      // Parse data rows
      const parsedData: ParsedInwardItem[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((value) => value.trim())
        if (values.length < headers.length) continue // Skip incomplete rows

        const item: ParsedInwardItem = {
          name: values[nameIndex] || "",
          batch: values[batchIndex] || "",
          expiry: values[expiryIndex] || "",
          quantity: Number.parseInt(values[quantityIndex]) || 0,
          purchasePrice: Number.parseFloat(values[purchasePriceIndex]) || 0,
          price: Number.parseFloat(values[priceIndex]) || 0,
          gstRate: Number.parseFloat(values[gstIndex]) || 0,
          valid: true,
        }

        // Validate item
        if (!item.name) {
          item.valid = false
          item.error = "Missing product name"
        } else if (!item.batch) {
          item.valid = false
          item.error = "Missing batch number"
        } else if (!item.expiry) {
          item.valid = false
          item.error = "Missing expiry date"
        } else if (item.quantity <= 0) {
          item.valid = false
          item.error = "Invalid quantity"
        } else if (item.purchasePrice <= 0) {
          item.valid = false
          item.error = "Invalid purchase price"
        } else if (item.price <= 0) {
          item.valid = false
          item.error = "Invalid selling price"
        } else if (item.gstRate < 0) {
          item.valid = false
          item.error = "Invalid GST rate"
        }

        parsedData.push(item)
      }

      if (parsedData.length === 0) {
        setVerificationStatus("error")
        setErrorMessage("No valid data found in the CSV file")
        return
      }

      setParsedItems(parsedData)
      setVerificationStatus(parsedData.every((item) => item.valid) ? "success" : "error")
    } catch (error) {
      console.error("Error parsing CSV:", error)
      setVerificationStatus("error")
      setErrorMessage("Failed to parse CSV file. Please check the format.")
    }
  }, [csvData])

  const handleAddToInventory = () => {
    if (parsedItems.length === 0 || !parsedItems.every((item) => item.valid)) {
      setErrorMessage("Please fix all errors before adding to inventory")
      return
    }

    if (!supplier || !invoiceNo) {
      setErrorMessage("Please enter supplier name and invoice number")
      return
    }

    try {
      // Convert parsed items to inventory items
      const inventoryItems: InventoryItem[] = parsedItems.map((item) => {
        // Check if item already exists in inventory
        const existingItem = existingInventory.find(
          (invItem) => invItem.name === item.name && invItem.batch === item.batch,
        )

        return {
          id: existingItem?.id || uuidv4(),
          name: item.name,
          batch: item.batch,
          expiry: item.expiry,
          stock: existingItem ? existingItem.stock + item.quantity : item.quantity,
          purchasePrice: item.purchasePrice,
          price: item.price,
          gstRate: item.gstRate,
        }
      })

      // Create inward entry
      const inwardItems: InwardItem[] = parsedItems.map((item) => ({
        name: item.name,
        batch: item.batch,
        expiry: item.expiry,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        price: item.price,
        gstRate: item.gstRate,
      }))

      const totalValue = inwardItems.reduce(
        (sum, item) => sum + item.quantity * item.purchasePrice * (1 + item.gstRate / 100),
        0,
      )

      const inwardEntry: InwardEntry = {
        id: uuidv4(),
        date: new Date().toISOString().split("T")[0],
        invoiceNo,
        supplier,
        paymentStatus,
        items: inwardItems,
        totalValue,
      }

      // Add to inventory and save inward entry
      onAddToInventory(inventoryItems)
      onSaveInwardEntry(inwardEntry)

      // Reset form
      setCsvData("")
      setParsedItems([])
      setVerificationStatus("idle")
      setErrorMessage("")
      setSupplier("")
      setInvoiceNo("")
      setPaymentStatus("Pending")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error adding to inventory:", error)
      setErrorMessage("Failed to add items to inventory. Please try again.")
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gray-800">Improved CSV Inward</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="csv">
          <TabsList className="mb-4">
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            <TabsTrigger value="preview">Data Preview</TabsTrigger>
            <TabsTrigger value="details">Invoice Details</TabsTrigger>
          </TabsList>

          <TabsContent value="csv">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="csv-file" className="text-sm font-medium">
                  Upload CSV File
                </label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="csv-data" className="text-sm font-medium">
                  Or Paste CSV Data
                </label>
                <Textarea
                  id="csv-data"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Paste CSV data here..."
                  className="h-32"
                />
              </div>

              <Button
                onClick={parseCSV}
                disabled={!csvData.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <FileTextIcon className="mr-2 h-4 w-4" />
                Verify CSV Data
              </Button>

              {verificationStatus === "error" && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage || "There are errors in the CSV data"}</AlertDescription>
                </Alert>
              )}

              {verificationStatus === "success" && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>CSV data verified successfully. {parsedItems.length} items found.</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview">
            {parsedItems.length > 0 ? (
              <div className="border rounded-md overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>GST %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.map((item, index) => (
                      <TableRow key={index} className={item.valid ? "" : "bg-red-50"}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell>{item.expiry}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell>₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>{item.gstRate}%</TableCell>
                        <TableCell>
                          {item.valid ? (
                            <span className="text-green-600 flex items-center">
                              <CheckCircleIcon className="h-4 w-4 mr-1" /> Valid
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center">
                              <AlertCircleIcon className="h-4 w-4 mr-1" /> {item.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No data to preview. Please upload and verify a CSV file first.
              </div>
            )}
          </TabsContent>

          <TabsContent value="details">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="supplier" className="text-sm font-medium">
                    Supplier Name
                  </label>
                  <Input
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="invoice-no" className="text-sm font-medium">
                    Invoice Number
                  </label>
                  <Input
                    id="invoice-no"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="Enter invoice number"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="payment-status" className="text-sm font-medium">
                  Payment Status
                </label>
                <select
                  id="payment-status"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleAddToInventory}
                  disabled={
                    parsedItems.length === 0 || !parsedItems.every((item) => item.valid) || !supplier || !invoiceNo
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Add to Inventory
                </Button>
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
