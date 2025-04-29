"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusIcon, TrashIcon, PrinterIcon, CheckCircleIcon, AlertCircleIcon, Share2Icon } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useLocalStorage } from "../hooks/use-local-storage"
import generateEnhancedInvoicePDF from "../utils/enhanced-pdf-generator"
import { shareInvoiceViaWhatsApp } from "../utils/whatsapp-share"
import type { InventoryItem, Transaction, TransactionItem } from "../types/erp-types"

export default function BillingWithReferral() {
  // Local storage hooks
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>("inventory", [])
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("transactions", [])

  // Form state
  const [customer, setCustomer] = useState("")
  const [mobile, setMobile] = useState("")
  const [doctor, setDoctor] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [items, setItems] = useState<TransactionItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])
  const [discount, setDiscount] = useState(0)

  // Referral bonus state
  const [showReferral, setShowReferral] = useState(false)
  const [referralName, setReferralName] = useState("")
  const [referralAmount, setReferralAmount] = useState(0)

  // Status messages
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Group items by GST rate for tax calculation
  const gstGroups = items.reduce(
    (groups, item) => {
      const rate = item.gstRate
      if (!groups[rate]) {
        groups[rate] = 0
      }
      groups[rate] += item.price * item.quantity
      return groups
    },
    {} as Record<number, number>,
  )

  // Calculate taxes
  const taxes = Object.entries(gstGroups).map(([rate, amount]) => {
    const numRate = Number.parseFloat(rate)
    return {
      rate: numRate,
      amount: (amount * numRate) / 100,
    }
  })

  const totalTax = taxes.reduce((sum, tax) => sum + tax.amount, 0)
  const total = subtotal + totalTax - discount - referralAmount

  // Reset success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Search inventory
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const results = inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.batch.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [searchTerm, inventory])

  // Handle adding an item to the bill
  const handleAddItem = (inventoryItem: InventoryItem) => {
    // Check if item is already in the bill
    const existingItemIndex = items.findIndex(
      (item) => item.name === inventoryItem.name && item.batch === inventoryItem.batch,
    )

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const updatedItems = [...items]
      updatedItems[existingItemIndex].quantity += 1
      setItems(updatedItems)
    } else {
      // Add new item
      setItems([
        ...items,
        {
          name: inventoryItem.name,
          batch: inventoryItem.batch,
          expiry: inventoryItem.expiry,
          mrp: inventoryItem.price,
          price: inventoryItem.price,
          quantity: 1,
          gstRate: inventoryItem.gstRate,
        },
      ])
    }

    // Clear search
    setSearchTerm("")
    setSearchResults([])
  }

  // Handle removing an item from the bill
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...items]
    updatedItems.splice(index, 1)
    setItems(updatedItems)
  }

  // Handle updating item quantity
  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return

    const updatedItems = [...items]
    updatedItems[index].quantity = quantity
    setItems(updatedItems)
  }

  // Handle generating invoice
  const handleGenerateInvoice = () => {
    // Validate form
    if (!customer || !mobile || items.length === 0) {
      setErrorMessage("Please fill in all required fields and add at least one item")
      return
    }

    try {
      // Create transaction
      const newTransaction: Transaction = {
        id: uuidv4(),
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        customer,
        mobile,
        doctor,
        paymentMethod,
        items,
        subtotal,
        taxes,
        totalTax,
        discount,
        total,
      }

      // Update inventory
      const updatedInventory = [...inventory]

      items.forEach((item) => {
        const inventoryItemIndex = updatedInventory.findIndex(
          (invItem) => invItem.name === item.name && invItem.batch === item.batch,
        )

        if (inventoryItemIndex >= 0) {
          updatedInventory[inventoryItemIndex].stock -= item.quantity
        }
      })

      // Save to local storage
      setInventory(updatedInventory)
      setTransactions([newTransaction, ...transactions])

      // Generate PDF
      const pdfBase64 = generateEnhancedInvoicePDF(newTransaction, {
        showReferralBonus: showReferral && referralName && referralAmount > 0,
        referralName,
        referralAmount,
        includeQuote: true,
        quote: "Thank you for choosing Generic Aadhaar. Your health is our priority!",
      })

      // Open PDF in new tab
      const pdfWindow = window.open()
      if (pdfWindow) {
        pdfWindow.document.write(`<iframe width="100%" height="100%" src="${pdfBase64}"></iframe>`)
      }

      // Reset form
      setCustomer("")
      setMobile("")
      setDoctor("")
      setPaymentMethod("Cash")
      setItems([])
      setDiscount(0)
      setShowReferral(false)
      setReferralName("")
      setReferralAmount(0)

      setSuccessMessage("Invoice generated successfully!")
    } catch (error) {
      console.error("Error generating invoice:", error)
      setErrorMessage("Failed to generate invoice. Please try again.")
    }
  }

  // Handle sharing invoice via WhatsApp
  const handleShareViaWhatsApp = () => {
    if (!customer || !mobile || items.length === 0) {
      setErrorMessage("Please fill in all required fields and add at least one item")
      return
    }

    try {
      const itemsList = items.map((item) => `${item.name} (${item.quantity} x ₹${item.price})`).join(", ")

      const message = `
*Generic Aadhaar Invoice*
Customer: ${customer}
Mobile: ${mobile}
${doctor ? `Doctor: ${doctor}` : ""}
Date: ${new Date().toLocaleDateString()}

*Items:*
${itemsList}

Subtotal: ₹${subtotal.toFixed(2)}
${discount > 0 ? `Discount: ₹${discount.toFixed(2)}` : ""}
${showReferral && referralName && referralAmount > 0 ? `Referral Bonus (${referralName}): ₹${referralAmount.toFixed(2)}` : ""}
Total Tax: ₹${totalTax.toFixed(2)}
*Total Amount: ₹${total.toFixed(2)}*

Thank you for choosing Generic Aadhaar Pharmacy!
`

      // Create a transaction object for the WhatsApp share function
      const transaction: Transaction = {
        id: uuidv4(),
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        customer,
        mobile,
        doctor,
        paymentMethod,
        items,
        subtotal,
        taxes,
        totalTax,
        discount,
        total,
      }

      // Use the correct function from the whatsapp-share utility
      shareInvoiceViaWhatsApp(transaction, undefined, mobile)

      setSuccessMessage("Invoice shared via WhatsApp!")
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error)
      setErrorMessage("Failed to share invoice. Please try again.")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="customer" className="text-sm font-medium">
                Customer Name
              </label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="mobile" className="text-sm font-medium">
                Mobile Number
              </label>
              <Input
                id="mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="doctor" className="text-sm font-medium">
                Doctor Name (Optional)
              </label>
              <Input
                id="doctor"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="Enter doctor name"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="payment-method" className="text-sm font-medium">
                Payment Method
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Add Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search Products
              </label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or batch..."
              />
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-md overflow-auto max-h-40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell>{item.expiry}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleAddItem(item)}
                            disabled={item.stock <= 0}
                            size="sm"
                            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length > 0 ? (
              <div className="border rounded-md overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>GST %</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell>{item.expiry}</TableCell>
                        <TableCell>₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              -
                            </Button>
                            <span>{item.quantity}</span>
                            <Button
                              onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{item.gstRate}%</TableCell>
                        <TableCell>₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleRemoveItem(index)}
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No items added to the bill yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Bill Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between py-2">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                {taxes.map((tax, index) => (
                  <div key={index} className="flex justify-between py-1 text-sm text-gray-600">
                    <span>GST {tax.rate}%:</span>
                    <span>₹{tax.amount.toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between py-2">
                  <span>Total Tax:</span>
                  <span>₹{totalTax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-2">
                  <span>Discount:</span>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      value={discount || ""}
                      onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 mr-2"
                    />
                    <span>₹</span>
                  </div>
                </div>

                <div className="flex items-center py-2">
                  <input
                    type="checkbox"
                    id="show-referral"
                    checked={showReferral}
                    onChange={(e) => setShowReferral(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="show-referral" className="text-sm font-medium">
                    Add Referral Bonus
                  </label>
                </div>

                {showReferral && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center">
                      <span className="w-24">Name:</span>
                      <Input
                        value={referralName}
                        onChange={(e) => setReferralName(e.target.value)}
                        className="w-full"
                        placeholder="Referrer's name"
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="w-24">Amount:</span>
                      <Input
                        type="number"
                        value={referralAmount || ""}
                        onChange={(e) => setReferralAmount(Number.parseFloat(e.target.value) || 0)}
                        className="w-full"
                        placeholder="Bonus amount"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-2 font-bold text-lg border-t mt-2">
                  <span>Total Amount:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={!customer || !mobile || items.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <PrinterIcon className="mr-2 h-4 w-4" />
                  Generate Invoice
                </Button>

                <Button
                  onClick={handleShareViaWhatsApp}
                  disabled={!customer || !mobile || items.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <Share2Icon className="mr-2 h-4 w-4" />
                  Share via WhatsApp
                </Button>
              </div>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
