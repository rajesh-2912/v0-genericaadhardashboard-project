"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Check, Upload } from "lucide-react"
import { parseCSVWithFlexibleMapping, type ParsedItem } from "../utils/csv-parser"

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: ParsedItem[]) => void
}

export function CSVImportDialog({ open, onOpenChange, onImport }: CSVImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({})
  const [rawData, setRawData] = useState<any[]>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const csvContent = e.target?.result as string

          const result = await parseCSVWithFlexibleMapping(csvContent, setProgress)

          setParsedItems(result.items)
          setColumnMapping(result.columnMapping)
          setRawData(result.rawData)
          setIsProcessing(false)
        } catch (error) {
          console.error("Error processing CSV:", error)
          setError(error instanceof Error ? error.message : "Failed to process CSV")
          setIsProcessing(false)
        }
      }

      reader.onerror = () => {
        setError("Failed to read file")
        setIsProcessing(false)
      }

      reader.readAsText(file)
    } catch (error) {
      console.error("Error handling file upload:", error)
      setError(error instanceof Error ? error.message : "Failed to upload file")
      setIsProcessing(false)
    }

    // Reset the input
    event.target.value = ""
  }

  const handleImport = () => {
    onImport(parsedItems)
    onOpenChange(false)
  }

  const getMappingStatus = (field: string) => {
    const index = columnMapping[field]
    return index >= 0 ? "Found" : "Not found"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Inventory from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Flexible CSV Import</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Upload any CSV file with inventory data. The system will try to automatically map columns.</p>
                  <p className="mt-1">Common column names that will be recognized:</p>
                  <ul className="list-disc pl-5 mt-1 text-xs">
                    <li>Name: name, medicine, drug, item, product</li>
                    <li>Batch: batch, batch no, lot number</li>
                    <li>Expiry: expiry, expiry date, exp</li>
                    <li>Stock: stock, quantity, qty, count</li>
                    <li>Purchase Price: purchase price, cost, buying price</li>
                    <li>Selling Price: price, selling price, mrp</li>
                    <li>GST Rate: gst, gst rate, tax rate</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Button variant="outline" className="w-full" disabled={isProcessing}>
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Select CSV File"}
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing CSV data...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error processing CSV</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {parsedItems.length > 0 && (
            <>
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">CSV processed successfully</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Found {parsedItems.length} items in the CSV file.</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="font-medium">Column mapping:</p>
                          <ul className="text-xs mt-1">
                            <li>Name: {getMappingStatus("name")}</li>
                            <li>Batch: {getMappingStatus("batch")}</li>
                            <li>Expiry: {getMappingStatus("expiry")}</li>
                            <li>Stock: {getMappingStatus("stock")}</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">Additional columns:</p>
                          <ul className="text-xs mt-1">
                            <li>Purchase Price: {getMappingStatus("purchasePrice")}</li>
                            <li>Selling Price: {getMappingStatus("price")}</li>
                            <li>GST Rate: {getMappingStatus("gstRate")}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Purchase Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">GST Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.slice(0, 10).map((item, index) => (
                      <TableRow key={index} className="hover:bg-brand-50">
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell>{item.expiry}</TableCell>
                        <TableCell className="text-right">{item.stock}</TableCell>
                        <TableCell className="text-right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.gstRate}%</TableCell>
                      </TableRow>
                    ))}
                    {parsedItems.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-neutral-500">
                          ... and {parsedItems.length - 10} more items
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} className="bg-brand-500 hover:bg-brand-600">
                  Import {parsedItems.length} Items
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
