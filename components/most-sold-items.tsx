"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import type { Transaction } from "../types/erp-types"

interface MostSoldItemsProps {
  transactions: Transaction[]
  onExport: () => void
}

export default function MostSoldItems({ transactions, onExport }: MostSoldItemsProps) {
  // Create a map to track item sales
  const itemMap = new Map<
    string,
    {
      id: string
      name: string
      totalQuantity: number
      totalRevenue: number
      transactionCount: number
    }
  >()

  // Process all transactions
  transactions.forEach((transaction) => {
    transaction.items.forEach((item) => {
      const existingItem = itemMap.get(item.id)

      if (existingItem) {
        // Update existing item
        itemMap.set(item.id, {
          ...existingItem,
          totalQuantity: existingItem.totalQuantity + item.quantity,
          totalRevenue: existingItem.totalRevenue + item.total,
          transactionCount: existingItem.transactionCount + 1,
        })
      } else {
        // Add new item
        itemMap.set(item.id, {
          id: item.id,
          name: item.name,
          totalQuantity: item.quantity,
          totalRevenue: item.total,
          transactionCount: 1,
        })
      }
    })
  })

  // Convert map to array and sort by quantity
  const mostSoldItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10) // Top 10 items

  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-md font-medium text-indigo-800">Most Sold Items</CardTitle>
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
        {mostSoldItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mostSoldItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.totalQuantity}</TableCell>
                  <TableCell className="text-right">₹{item.totalRevenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>No sales data available</p>
            <p className="text-sm">Generate invoices to see most sold items</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
