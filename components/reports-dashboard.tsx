"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, FileDown } from "lucide-react"
import { useTransactionsSync } from "../hooks/use-supabase-sync"
import SalesDashboard from "./sales-dashboard"
import MostSoldItems from "./most-sold-items"
import CustomerReport from "./customer-report"
import GSTBreakdown from "./gst-breakdown"

export default function ReportsDashboard() {
  const [transactions, setTransactions, syncInfo] = useTransactionsSync([])
  const [activeTab, setActiveTab] = useState("sales")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter((transaction) => {
    if (!dateRange.from && !dateRange.to) return true

    const transactionDate = new Date(transaction.date)

    if (dateRange.from && dateRange.to) {
      return transactionDate >= dateRange.from && transactionDate <= dateRange.to
    }

    if (dateRange.from) {
      return transactionDate >= dateRange.from
    }

    if (dateRange.to) {
      return transactionDate <= dateRange.to
    }

    return true
  })

  // Export data based on active tab
  const handleExport = () => {
    let csvData = ""
    let filename = ""

    switch (activeTab) {
      case "sales":
        // Export sales data
        csvData = "Date,Total Sales\n"
        const salesByDate = new Map<string, number>()

        filteredTransactions.forEach((transaction) => {
          const date = transaction.date
          const currentTotal = salesByDate.get(date) || 0
          salesByDate.set(date, currentTotal + transaction.total)
        })

        Array.from(salesByDate.entries()).forEach(([date, total]) => {
          csvData += `${date},${total.toFixed(2)}\n`
        })

        filename = "sales_report"
        break

      case "items":
        // Export most sold items
        csvData = "Item,Quantity Sold,Revenue\n"
        const itemMap = new Map<
          string,
          {
            name: string
            totalQuantity: number
            totalRevenue: number
          }
        >()

        filteredTransactions.forEach((transaction) => {
          transaction.items.forEach((item) => {
            const existingItem = itemMap.get(item.id)

            if (existingItem) {
              itemMap.set(item.id, {
                name: item.name,
                totalQuantity: existingItem.totalQuantity + item.quantity,
                totalRevenue: existingItem.totalRevenue + item.total,
              })
            } else {
              itemMap.set(item.id, {
                name: item.name,
                totalQuantity: item.quantity,
                totalRevenue: item.total,
              })
            }
          })
        })

        Array.from(itemMap.values())
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .forEach((item) => {
            csvData += `"${item.name}",${item.totalQuantity},${item.totalRevenue.toFixed(2)}\n`
          })

        filename = "most_sold_items"
        break

      case "customers":
        // Export customer data
        csvData = "Customer,Mobile,Total Visits,Total Spent,Last Visit,Average Bill\n"
        const customerMap = new Map<
          string,
          {
            name: string
            mobile: string
            totalVisits: number
            totalSpent: number
            lastVisit: string
            averageBill: number
          }
        >()

        filteredTransactions.forEach((transaction) => {
          const { customer, mobile, date, total } = transaction

          if (customerMap.has(mobile)) {
            const existingData = customerMap.get(mobile)!

            customerMap.set(mobile, {
              ...existingData,
              totalVisits: existingData.totalVisits + 1,
              totalSpent: existingData.totalSpent + total,
              lastVisit: date > existingData.lastVisit ? date : existingData.lastVisit,
              averageBill: (existingData.totalSpent + total) / (existingData.totalVisits + 1),
            })
          } else {
            customerMap.set(mobile, {
              name: customer,
              mobile,
              totalVisits: 1,
              totalSpent: total,
              lastVisit: date,
              averageBill: total,
            })
          }
        })

        Array.from(customerMap.values())
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .forEach((customer) => {
            csvData += `"${customer.name}","${customer.mobile}",${customer.totalVisits},${customer.totalSpent.toFixed(
              2,
            )},"${customer.lastVisit}",${customer.averageBill.toFixed(2)}\n`
          })

        filename = "customer_report"
        break

      case "gst":
        // Export GST data
        csvData = "GST Rate,Taxable Amount,CGST,SGST,Total Tax\n"
        const gstMap = new Map<
          number,
          {
            taxableAmount: number
            cgst: number
            sgst: number
            totalTax: number
          }
        >()

        filteredTransactions.forEach((transaction) => {
          transaction.taxes.forEach((tax) => {
            const existingData = gstMap.get(tax.rate)

            if (existingData) {
              gstMap.set(tax.rate, {
                taxableAmount: existingData.taxableAmount + tax.taxableAmount,
                cgst: existingData.cgst + tax.cgst,
                sgst: existingData.sgst + tax.sgst,
                totalTax: existingData.totalTax + tax.totalTax,
              })
            } else {
              gstMap.set(tax.rate, {
                taxableAmount: tax.taxableAmount,
                cgst: tax.cgst,
                sgst: tax.sgst,
                totalTax: tax.totalTax,
              })
            }
          })
        })

        Array.from(gstMap.entries())
          .sort((a, b) => a[0] - b[0])
          .forEach(([rate, data]) => {
            csvData += `${rate}%,${data.taxableAmount.toFixed(2)},${data.cgst.toFixed(2)},${data.sgst.toFixed(
              2,
            )},${data.totalTax.toFixed(2)}\n`
          })

        filename = "gst_report"
        break
    }

    // Add date range to filename if present
    if (dateRange.from || dateRange.to) {
      const fromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "start"
      const toStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "end"
      filename += `_${fromStr}_to_${toStr}`
    }

    // Download CSV
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Reports & Analytics</CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="sales">Sales Overview</TabsTrigger>
              <TabsTrigger value="items">Most Sold Items</TabsTrigger>
              <TabsTrigger value="customers">Customer Database</TabsTrigger>
              <TabsTrigger value="gst">GST Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              <SalesDashboard transactions={filteredTransactions} />
            </TabsContent>

            <TabsContent value="items">
              <MostSoldItems transactions={filteredTransactions} onExport={handleExport} />
            </TabsContent>

            <TabsContent value="customers">
              <CustomerReport transactions={filteredTransactions} onExport={handleExport} />
            </TabsContent>

            <TabsContent value="gst">
              <GSTBreakdown
                transactions={filteredTransactions}
                taxes={filteredTransactions.flatMap((t) => t.taxes) || []}
                onExport={handleExport}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
