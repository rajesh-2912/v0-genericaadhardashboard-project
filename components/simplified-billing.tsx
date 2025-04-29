"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Download, Loader2, Plus, Trash2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { generateInvoicePDF, openPDF, downloadPDF } from "../utils/pdf-generator"
import { shareInvoiceViaWhatsApp } from "../utils/whatsapp-share"
import type { InventoryItem, BillingItem, Transaction } from "../types/erp-types"

interface SimplifiedBillingProps {
  inventory: InventoryItem[]
  onCreateInvoice: (invoice: Transaction) => void
  onUpdateInventory: (updatedItems: InventoryItem[]) => void
}

export default function SimplifiedBilling({ inventory, onCreateInvoice, onUpdateInventory }: SimplifiedBillingProps) {
  // Customer information
  const [customer, setCustomer] = useState("")
  const [mobile, setMobile] = useState("")
  const [doctor, setDoctor] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")

  // Search and selection
  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Billing items
  const [items, setItems] = useState<BillingItem[]>([])
  const [discount, setDiscount] = useState(0)

  // Processing states
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentInvoice, setCurrentInvoice] = useState<Transaction | null>(null)

  // Filter inventory based on search term
  const filteredInventory = inventory.filter(
    (item) =>
      item.stock > 0 &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)

    // Group items by GST rate
    const taxGroups = items.reduce((groups: Record<string, any>, item) => {
      const rate = item.gstRate
      if (!groups[rate]) {
        groups[rate] = {
          rate,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          amount: 0,
        }
      }

      // Calculate tax amount
      const taxAmount = (item.total * item.gstRate) / 100

      groups[rate].taxableAmount += item.total
      groups[rate].cgst += taxAmount / 2
      groups[rate].sgst += taxAmount / 2
      groups[rate].amount += taxAmount

      return groups
    }, {})

    // Convert to array
    const taxes = Object.values(taxGroups)

    // Calculate total tax
    const totalTax = taxes.reduce((sum: number, tax: any) => sum + tax.amount, 0)

    // Calculate grand total
    const total = subtotal + totalTax - discount

    return { subtotal, taxes, totalTax, total }
  }

  // Add item to bill
  const addItem = () => {
    if (!selectedItem) return

    // Check if item already exists in bill
    const existingIndex = items.findIndex((item) => item.id === selectedItem.id && item.batch === selectedItem.batch)

    if (existingIndex >= 0) {
      // Update existing item
      const updatedItems = [...items]
      const newQuantity = updatedItems[existingIndex].quantity + quantity
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: newQuantity,
        total: newQuantity * selectedItem.price,
      }
      setItems(updatedItems)
    } else {
      // Add new item
      const newItem: BillingItem = {
        id: selectedItem.id,
        name: selectedItem.name,
        batch: selectedItem.batch,
        quantity: quantity,
        price: selectedItem.price,
        gstRate: selectedItem.gstRate,
        total: quantity * selectedItem.price,
      }
      setItems([...items, newItem])
    }

    // Reset selection
    setSelectedItem(null)
    setQuantity(1)
    setSearchTerm("")
  }

  // Remove item from bill
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Generate and submit invoice
  const generateInvoice = async () => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the bill",
        variant: "destructive",
      })
      return
    }

    if (!customer || !mobile) {
      toast({
        title: "Error",
        description: "Please enter customer name and mobile number",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const { subtotal, taxes, totalTax, total } = calculateTotals()

      // Create invoice
      const invoice: Transaction = {
        id: uuidv4(),
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        customer,
        mobile,
        doctor: doctor || undefined,
        paymentMethod,
        items,
        subtotal,
        taxes: taxes as any,
        totalTax,
        discount,
        total,
      }

      // Update inventory
      const updatedInventory = [...inventory]
      for (const item of items) {
        const inventoryIndex = updatedInventory.findIndex((i) => i.id === item.id)
        if (inventoryIndex >= 0) {
          updatedInventory[inventoryIndex] = {
            ...updatedInventory[inventoryIndex],
            stock: updatedInventory[inventoryIndex].stock - item.quantity,
          }
        }
      }

      // Save invoice and update inventory
      onCreateInvoice(invoice)
      onUpdateInventory(updatedInventory)

      // Generate PDF
      const pdfDoc = generateInvoicePDF(invoice)
      openPDF(pdfDoc)

      // Set current invoice and mark as submitted
      setCurrentInvoice(invoice)
      setIsSubmitted(true)

      toast({
        title: "Success",
        description: "Invoice generated successfully",
      })
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!currentInvoice) return

    try {
      const pdfDoc = generateInvoicePDF(currentInvoice)
      downloadPDF(pdfDoc, `invoice-${currentInvoice.id}.pdf`)

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      })
    } catch (error) {
      console.error("Error downloading invoice:", error)
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      })
    }
  }

  // Share via WhatsApp
  const handleShareWhatsApp = async () => {
    if (!currentInvoice) return

    try {
      const pdfDoc = generateInvoicePDF(currentInvoice)
      const pdfBlob = pdfDoc.output("blob")
      await shareInvoiceViaWhatsApp(currentInvoice, pdfBlob, currentInvoice.mobile)

      toast({
        title: "Success",
        description: "Invoice shared via WhatsApp",
      })
    } catch (error) {
      console.error("Error sharing invoice:", error)
      toast({
        title: "Error",
        description: "Failed to share invoice via WhatsApp",
        variant: "destructive",
      })
    }
  }

  // Start new bill
  const startNewBill = () => {
    setCustomer("")
    setMobile("")
    setDoctor("")
    setPaymentMethod("Cash")
    setItems([])
    setDiscount(0)
    setIsSubmitted(false)
    setCurrentInvoice(null)
  }

  return (
    <div className="space-y-4">
      {isSubmitted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center">
              <Check className="mr-2 h-5 w-5" />
              Invoice Generated Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>Invoice #{currentInvoice?.id.substring(0, 8).toUpperCase()}</AlertTitle>
                <AlertDescription>
                  <p>Customer: {currentInvoice?.customer}</p>
                  <p>Total Amount: ₹{currentInvoice?.total.toFixed(2)}</p>
                  <p>
                    Date: {currentInvoice?.date} {currentInvoice?.time}
                  </p>
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={handleShareWhatsApp} className="bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />
                  Share via WhatsApp
                </Button>
                <Button onClick={startNewBill} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  New Bill
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name*</Label>
                  <Input
                    id="customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number*</Label>
                  <Input
                    id="mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter mobile number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor (Optional)</Label>
                  <Input
                    id="doctor"
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                    placeholder="Enter doctor name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Select Medicine</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {selectedItem ? selectedItem.name : "Search medicines..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search medicine..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No medicine found.</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            {filteredInventory.map((item) => (
                              <CommandItem
                                key={item.id}
                                value={item.id}
                                onSelect={() => {
                                  setSelectedItem(item)
                                  setOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedItem?.id === item.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{item.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Batch: {item.batch} | Stock: {item.stock} | ₹{item.price.toFixed(2)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedItem?.stock || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    disabled={!selectedItem}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={addItem} disabled={!selectedItem} className="w-full bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Bill
                  </Button>
                </div>
              </div>

              {selectedItem && (
                <div className="mb-4 p-2 border rounded-md bg-blue-50">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Selected:</span>
                      <p>{selectedItem.name}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Batch:</span>
                      <p>{selectedItem.batch}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Price:</span>
                      <p>₹{selectedItem.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Available:</span>
                      <p>{selectedItem.stock}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          No items added to bill yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.batch}</TableCell>
                          <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.gstRate}%</TableCell>
                          <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bill Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">GST Breakdown</h3>
                    <div className="border rounded-md p-3 bg-gray-50">
                      {calculateTotals().taxes.map((tax: any, index) => (
                        <div key={index} className="grid grid-cols-4 text-sm mb-1">
                          <div>{tax.rate}% GST:</div>
                          <div>₹{tax.taxableAmount.toFixed(2)}</div>
                          <div>CGST: ₹{(tax.amount / 2).toFixed(2)}</div>
                          <div>SGST: ₹{(tax.amount / 2).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Total</h3>
                    <div className="border rounded-md p-3 bg-gray-50">
                      <div className="flex justify-between mb-1">
                        <span>Subtotal:</span>
                        <span>₹{calculateTotals().subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Total Tax:</span>
                        <span>₹{calculateTotals().totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Discount:</span>
                        <div className="flex items-center">
                          <span>₹</span>
                          <Input
                            type="number"
                            min="0"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                            className="w-20 h-6 ml-1"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                        <span>Grand Total:</span>
                        <span>₹{calculateTotals().total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={generateInvoice}
                    disabled={isGenerating || items.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Invoice</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
