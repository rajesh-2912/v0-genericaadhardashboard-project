"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Papa from "papaparse"
import type { Transaction } from "../types/erp-types"

interface SimplifiedReportsProps {
  transactions: Transaction[]
}

export default function SimplifiedReports({ transactions }: SimplifiedReportsProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [activeTab, setActiveTab] = useState<"sales" | "items" | "customers" | "gst">("sales")

  // Filter transactions by date range
  const filteredTransactions = transactions.filter((transaction) => {
    if (!startDate && !endDate) return true

    const transactionDate = new Date(transaction.date)
    const start = startDate ? new Date(startDate) : new Date(0)
    const end = endDate ? new Date(endDate) : new Date()

    return transactionDate >= start && transactionDate <= end
  })

  // Calculate sales by date
  const salesByDate = filteredTransactions.reduce(
    (acc, transaction) => {
      const date = transaction.date
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          total: 0,
          tax: 0,
        }
      }

      acc[date].count += 1
      acc[date].total += transaction.total
      acc[date].tax += transaction.totalTax

      return acc
    },
    {} as Record<string, { date: string; count: number; total: number; tax: number }>,
  )

  // Calculate most sold items
  const itemSales = filteredTransactions.reduce(
    (acc, transaction) => {
      transaction.items.forEach((item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          }
        }

        acc[item.name].quantity += item.quantity
        acc[item.name].revenue += item.total
      })

      return acc
    },
    {} as Record<string, { name: string; quantity: number; revenue: number }>,
  )

  // Calculate customer data
  const customerData = filteredTransactions.reduce(
    (acc, transaction) => {
      const { customer, mobile, total } = transaction

      if (!acc[mobile]) {
        acc[mobile] = {
          name: customer,
          mobile,
          visits: 0,
          spent: 0,
        }
      }

      acc[mobile].visits += 1
      acc[mobile].spent += total

      return acc
    },
    {} as Record<string, { name: string; mobile: string; visits: number; spent: number }>,
  )

  // Calculate GST data
  const gstData = filteredTransactions.reduce(
    (acc, transaction) => {
      transaction.taxes.forEach((tax) => {
        const rate = tax.rate

        if (!acc[rate]) {
          acc[rate] = {
            rate,
            taxableAmount: 0,
            tax: 0,
          }
        }

        acc[rate].taxableAmount += tax.taxableAmount || 0
        acc[rate].tax += tax.amount
      })

      return acc
    },
    {} as Record<number, { rate: number; taxableAmount: number; tax: number }>,
  )

  // Export data as CSV
  const exportData = () => {
    let data: any[] = []
    let filename = ""

    switch (activeTab) {
      case "sales":
        data = Object.values(salesByDate).map((sale) => ({
          Date: sale.date,
          "Invoice Count": sale.count,
          "Total Sales": sale.total.toFixed(2),
          "Total Tax": sale.tax.toFixed(2),
        }))
        filename = "sales_report"
        break

      case "items":
        data = Object.values(itemSales)
          .sort((a, b) => b.quantity - a.quantity)
          .map((item) => ({
            "Item Name": item.name,
            "Quantity Sold": item.quantity,
            Revenue: item.revenue.toFixed(2),
          }))
        filename = "items_report"
        break

      case "customers":
        data = Object.values(customerData)
          .sort((a, b) => b.spent - a.spent)
          .map((customer) => ({
            "Customer Name": customer.name,
            Mobile: customer.mobile,
            "Visit Count": customer.visits,
            "Total Spent": customer.spent.toFixed(2),
            "Average Bill": (customer.spent / customer.visits).toFixed(2),
          }))
        filename = "customers_report"
        break

      case "gst":
        data = Object.values(gstData)
          .sort((a, b) => a.rate - b.rate)
          .map((gst) => ({
            "GST Rate": `${gst.rate}%`,
            "Taxable Amount": gst.taxableAmount.toFixed(2),
            CGST: (gst.tax / 2).toFixed(2),
            SGST: (gst.tax / 2).toFixed(2),
            "Total Tax": gst.tax.toFixed(2),
          }))
        filename = "gst_report"
        break
    }

    try {
      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "Report exported successfully",
      })
    } catch (error) {
      console.error("Error exporting report:", error)
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Reports</CardTitle>
          <Button variant="outline" size="sm" onClick={exportData}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button variant={activeTab === "sales" ? "default" : "outline"} onClick={() => setActiveTab("sales")}>
              Sales Report
            </Button>
            <Button variant={activeTab === "items" ? "default" : "outline"} onClick={() => setActiveTab("items")}>
              Most Sold Items
            </Button>
            <Button
              variant={activeTab === "customers" ? "default" : "outline"}
              onClick={() => setActiveTab("customers")}
            >
              Customer Report
            </Button>
            <Button variant={activeTab === "gst" ? "default" : "outline"} onClick={() => setActiveTab("gst")}>
              GST Report
            </Button>
          </div>

          {/* Sales Report */}
          {activeTab === "sales" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 border rounded-md bg-blue-50">
                      <div className="text-lg font-semibold">Total Sales</div>
                      <div className="text-2xl font-bold">
                        ₹{filteredTransactions.reduce((sum, t) => sum + t.total, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 border rounded-md bg-green-50">
                      <div className="text-lg font-semibold">Invoice Count</div>
                      <div className="text-2xl font-bold">{filteredTransactions.length}</div>
                    </div>
                    <div className="p-4 border rounded-md bg-purple-50">
                      <div className="text-lg font-semibold">Average Bill</div>
                      <div className="text-2xl font-bold">
                        ₹
                        {filteredTransactions.length > 0
                          ? (
                              filteredTransactions.reduce((sum, t) => sum + t.total, 0) / filteredTransactions.length
                            ).toFixed(2)
                          : "0.00"}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Invoices</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(salesByDate).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              No sales data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          Object.values(salesByDate)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((sale) => (
                              <TableRow key={sale.date}>
                                <TableCell>{sale.date}</TableCell>
                                <TableCell className="text-right">{sale.count}</TableCell>
                                <TableCell className="text-right">₹{sale.total.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{sale.tax.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Most Sold Items */}
          {activeTab === "items" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Most Sold Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Quantity Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(itemSales).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                              No item sales data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          Object.values(itemSales)
                            .sort((a, b) => b.quantity - a.quantity)
                            .map((item) => (
                              <TableRow key={item.name}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">₹{item.revenue.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Customer Report */}
          {activeTab === "customers" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead className="text-right">Visits</TableHead>
                          <TableHead className="text-right">Total Spent</TableHead>
                          <TableHead className="text-right">Average Bill</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(customerData).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                              No customer data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          Object.values(customerData)
                            .sort((a, b) => b.spent - a.spent)
                            .map((customer) => (
                              <TableRow key={customer.mobile}>
                                <TableCell>{customer.name}</TableCell>
                                <TableCell>{customer.mobile}</TableCell>
                                <TableCell className="text-right">{customer.visits}</TableCell>
                                <TableCell className="text-right">₹{customer.spent.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  ₹{(customer.spent / customer.visits).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* GST Report */}
          {activeTab === "gst" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>GST Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GST Rate</TableHead>
                          <TableHead className="text-right">Taxable Amount</TableHead>
                          <TableHead className="text-right">CGST</TableHead>
                          <TableHead className="text-right">SGST</TableHead>
                          <TableHead className="text-right">Total Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(gstData).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                              No GST data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          Object.values(gstData)
                            .sort((a, b) => a.rate - b.rate)
                            .map((gst) => (
                              <TableRow key={gst.rate}>
                                <TableCell>{gst.rate}%</TableCell>
                                <TableCell className="text-right">₹{gst.taxableAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{(gst.tax / 2).toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{(gst.tax / 2).toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{gst.tax.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
