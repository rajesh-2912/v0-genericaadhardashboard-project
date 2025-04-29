"use client"

import { useState } from "react"
import { Button, Input, Table } from "antd"

interface InwardItem {
  key: string
  item: string
  quantity: number
  rate: number
  amount: number
}

const SimplifiedInward = () => {
  const [inwardItems, setInwardItems] = useState<InwardItem[]>([])
  const [item, setItem] = useState("")
  const [quantity, setQuantity] = useState<number | undefined>(undefined)
  const [rate, setRate] = useState<number | undefined>(undefined)

  const columns = [
    {
      title: "Item",
      dataIndex: "item",
      key: "item",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Rate",
      dataIndex: "rate",
      key: "rate",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },
  ]

  const addItem = () => {
    if (item && quantity !== undefined && rate !== undefined) {
      const amount = quantity * rate
      const newItem: InwardItem = {
        key: String(Date.now()),
        item,
        quantity,
        rate,
        amount,
      }
      setInwardItems([...inwardItems, newItem])
      setItem("")
      setQuantity(undefined)
      setRate(undefined)
    }
  }

  const saveInward = () => {
    // Implement your save logic here, e.g., send data to an API
    console.log("Saving Inward:", inwardItems)
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Simplified Inward Entry</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Input placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} />
        <Input
          placeholder="Quantity"
          type="number"
          value={quantity === undefined ? "" : quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <Input
          placeholder="Rate"
          type="number"
          value={rate === undefined ? "" : rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
      </div>
      <Button onClick={addItem} className="bg-blue-600 hover:bg-blue-700 text-white mb-4">
        Add Item
      </Button>
      <Table dataSource={inwardItems} columns={columns} />
      <Button onClick={saveInward} className="bg-green-600 hover:bg-green-700 text-white">
        Save Inward
      </Button>
    </div>
  )
}

export default SimplifiedInward
