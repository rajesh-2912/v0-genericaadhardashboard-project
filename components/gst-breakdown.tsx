import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface GSTBreakdownProps {
  taxes: { rate: number; amount: number }[]
  className?: string
}

export default function GSTBreakdown({ taxes, className = "" }: GSTBreakdownProps) {
  // Group taxes by rate
  const groupedTaxes = taxes.reduce(
    (acc, tax) => {
      if (!acc[tax.rate]) {
        acc[tax.rate] = 0
      }
      acc[tax.rate] += tax.amount
      return acc
    },
    {} as Record<number, number>,
  )

  return (
    <div className={className}>
      <h4 className="text-sm font-medium mb-2 text-indigo-700">GST Breakdown</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rate</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedTaxes).map(([rate, amount]) => (
            <TableRow key={rate}>
              <TableCell>{rate}%</TableCell>
              <TableCell className="text-right">₹{amount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-medium">Total</TableCell>
            <TableCell className="text-right font-medium">
              ₹
              {Object.values(groupedTaxes)
                .reduce((sum, amount) => sum + amount, 0)
                .toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
