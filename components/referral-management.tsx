"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Copy, Plus, Trash2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { ReferralCode } from "../types/erp-types"

export default function ReferralManagement() {
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([
    {
      id: "ref-1",
      code: "WELCOME10",
      discount: 10,
      usageLimit: 100,
      usageCount: 23,
      expiryDate: "2023-12-31",
      createdBy: "admin",
    },
    {
      id: "ref-2",
      code: "SUMMER20",
      discount: 20,
      usageLimit: 50,
      usageCount: 12,
      expiryDate: "2023-09-30",
      createdBy: "admin",
    },
  ])

  const [newReferral, setNewReferral] = useState<Partial<ReferralCode>>({
    code: "",
    discount: 10,
    usageLimit: 100,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleAddReferral = () => {
    if (!newReferral.code || !newReferral.discount || !newReferral.usageLimit || !newReferral.expiryDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const referralCode: ReferralCode = {
      id: `ref-${uuidv4()}`,
      code: newReferral.code,
      discount: newReferral.discount,
      usageLimit: newReferral.usageLimit,
      usageCount: 0,
      expiryDate: newReferral.expiryDate,
      createdBy: "admin", // In a real app, this would be the current user
    }

    setReferralCodes([...referralCodes, referralCode])
    setIsAddDialogOpen(false)
    setNewReferral({
      code: "",
      discount: 10,
      usageLimit: 100,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    })

    toast({
      title: "Success",
      description: "Referral code added successfully",
    })
  }

  const handleDeleteReferral = (id: string) => {
    setReferralCodes(referralCodes.filter((code) => code.id !== id))
    toast({
      title: "Success",
      description: "Referral code deleted",
      variant: "destructive",
    })
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied",
      description: "Referral code copied to clipboard",
    })
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Referral Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Referral Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Referral Code</DialogTitle>
              <DialogDescription>Create a new referral code for customers to use.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Code
                </Label>
                <Input
                  id="code"
                  value={newReferral.code}
                  onChange={(e) => setNewReferral({ ...newReferral, code: e.target.value.toUpperCase() })}
                  className="col-span-3"
                  placeholder="e.g., SUMMER20"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">
                  Discount (%)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  value={newReferral.discount}
                  onChange={(e) => setNewReferral({ ...newReferral, discount: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="usageLimit" className="text-right">
                  Usage Limit
                </Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={newReferral.usageLimit}
                  onChange={(e) => setNewReferral({ ...newReferral, usageLimit: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expiryDate" className="text-right">
                  Expiry Date
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={newReferral.expiryDate}
                  onChange={(e) => setNewReferral({ ...newReferral, expiryDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddReferral}>
                Create Referral Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralCodes.map((referral) => (
                <TableRow key={referral.id} className={isExpired(referral.expiryDate) ? "bg-gray-100" : ""}>
                  <TableCell className="font-medium">{referral.code}</TableCell>
                  <TableCell>{referral.discount}%</TableCell>
                  <TableCell>
                    {referral.usageCount} / {referral.usageLimit}
                  </TableCell>
                  <TableCell>{referral.expiryDate}</TableCell>
                  <TableCell>
                    {isExpired(referral.expiryDate) ? (
                      <span className="text-red-500">Expired</span>
                    ) : (
                      <span className="text-green-500">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyCode(referral.code)}
                        className="hover:bg-blue-50"
                      >
                        <Copy className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReferral(referral.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
