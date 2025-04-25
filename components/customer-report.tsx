"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Search } from "lucide-react"
import type { Transaction } from "../types/erp-types"

interface CustomerReportProps {
  transactions: Transaction[]
  onExport: () => void
}

interface CustomerData {
  mobile: string
  name: string
  totalVisits: number
  totalSpent: number
  lastVisit: string
  averageBill: number
}

export default function CustomerReport({ transactions, onExport }: CustomerReportProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Process transactions to get customer data
  const customerMap = new Map<string, CustomerData>()

  transactions.forEach((transaction) => {
    const { customer, mobile, date, total } = transaction

    if (customerMap.has(mobile)) {
      const existingData = customerMap.get(mobile)!

      // Update existing customer data
      customerMap.set(mobile, {
        ...existingData,
        totalVisits: existingData.totalVisits + 1,
        totalSpent: existingData.totalSpent + total,
        lastVisit: date > existingData.lastVisit ? date : existingData.lastVisit,
        averageBill: (existingData.totalSpent + total) / (existingData.totalVisits + 1),
      })
    } else {
      // Add new customer
      customerMap.set(mobile, {
        mobile,
        name: customer,
        totalVisits: 1,
        totalSpent: total,
        lastVisit: date,
        averageBill: total,
      })
    }
  })

  // Convert to array and sort by total spent
  const customersData = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent)

  // Filter customers based on search term
  const filteredCustomers = customersData.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.mobile.includes(searchTerm),
  )

  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-md font-medium text-indigo-800">Customer Database</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200"
        >
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 w-full max-w-sm">
          <Input
            placeholder="Search by name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead className="text-right">Avg. Bill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.mobile}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.mobile}</TableCell>
                    <TableCell className="text-right">{customer.totalVisits}</TableCell>
                    <TableCell className="text-right">₹{customer.totalSpent.toFixed(2)}</TableCell>
                    <TableCell>{customer.lastVisit}</TableCell>
                    <TableCell className="text-right">₹{customer.averageBill.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    {searchTerm ? "No customers match your search" : "No customer data available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
