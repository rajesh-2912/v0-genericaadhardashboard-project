"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { Transaction } from "../types/erp-types"

interface SalesDashboardProps {
  transactions: Transaction[]
}

export default function SalesDashboard({ transactions }: SalesDashboardProps) {
  // Process transactions to get daily sales data
  const dailySalesMap = new Map<string, number>()

  // Get the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split("T")[0]
  }).reverse()

  // Initialize with zero values
  last7Days.forEach((date) => {
    dailySalesMap.set(date, 0)
  })

  // Fill in actual sales data
  transactions.forEach((transaction) => {
    if (last7Days.includes(transaction.date)) {
      const currentTotal = dailySalesMap.get(transaction.date) || 0
      dailySalesMap.set(transaction.date, currentTotal + transaction.total)
    }
  })

  // Convert to array for chart
  const dailySalesData = Array.from(dailySalesMap.entries()).map(([date, total]) => ({
    date: date,
    sales: total,
  }))

  // Process transactions to get category sales data
  const categorySalesMap = new Map<string, number>()

  transactions.forEach((transaction) => {
    transaction.items.forEach((item) => {
      // Using first word of medicine name as a simple category
      const category = item.name.split(" ")[0]
      const currentTotal = categorySalesMap.get(category) || 0
      categorySalesMap.set(category, currentTotal + item.total)
    })
  })

  // Convert to array and get top 5 categories
  const categorySalesData = Array.from(categorySalesMap.entries())
    .map(([category, sales]) => ({ category, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="text-md font-medium text-indigo-800">Daily Sales (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] bg-white">
          <ChartContainer
            config={{
              sales: {
                label: "Sales (₹)",
                color: "hsl(260, 70%, 50%)",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getDate()}/${date.getMonth() + 1}`
                  }}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  name="Sales (₹)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="text-md font-medium text-indigo-800">Top 5 Categories by Sales</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] bg-white">
          <ChartContainer
            config={{
              sales: {
                label: "Sales (₹)",
                color: "hsl(230, 70%, 50%)",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="sales" fill="var(--color-sales)" name="Sales (₹)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
