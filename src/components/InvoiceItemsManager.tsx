import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { InvoiceItemFormData, invoiceItemSchema } from "@/lib/validations";
import { toast } from "sonner";

interface InvoiceItem extends InvoiceItemFormData {
  id?: string;
  position: number;
}

interface InvoiceItemsManagerProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
  onTotalsChange: (subtotal: number, total: number) => void;
  taxRate?: number;
  readOnly?: boolean;
}

const InvoiceItemsManager = ({ 
  items, 
  onItemsChange, 
  onTotalsChange, 
  taxRate = 0,
  readOnly = false 
}: InvoiceItemsManagerProps) => {
  const [editingItem, setEditingItem] = useState<Partial<InvoiceItem> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    onTotalsChange(subtotal, total);
  }, [items, taxRate, onTotalsChange]);

  const addNewItem = () => {
    setEditingItem({
      description: "",
      quantity: 1,
      unit_price: 0,
      position: items.length + 1,
    });
    setIsAdding(true);
  };

  const saveItem = () => {
    if (!editingItem) return;

    const validation = invoiceItemSchema.safeParse(editingItem);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const itemData = validation.data;
    const amount = itemData.quantity * itemData.unit_price;
    const newItem: InvoiceItem = {
      ...itemData,
      amount,
      position: editingItem.position || items.length + 1,
    };

    if (isAdding) {
      onItemsChange([...items, newItem]);
    } else {
      const updatedItems = items.map(item => 
        item.position === editingItem.position ? newItem : item
      );
      onItemsChange(updatedItems);
    }

    setEditingItem(null);
    setIsAdding(false);
    toast.success(isAdding ? "Item added" : "Item updated");
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsAdding(false);
  };

  const deleteItem = (position: number) => {
    const updatedItems = items
      .filter(item => item.position !== position)
      .map((item, index) => ({ ...item, position: index + 1 }));
    onItemsChange(updatedItems);
    toast.success("Item deleted");
  };

  const startEdit = (item: InvoiceItem) => {
    setEditingItem(item);
    setIsAdding(false);
  };

  const updateEditingItem = (field: keyof InvoiceItem, value: string | number) => {
    if (!editingItem) return;
    
    const updatedItem = { ...editingItem, [field]: value };
    
    // Auto-calculate amount when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : (editingItem.quantity || 0);
      const unitPrice = field === 'unit_price' ? Number(value) : (editingItem.unit_price || 0);
      updatedItem.amount = quantity * unitPrice;
    }
    
    setEditingItem(updatedItem);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Invoice Items
          {!readOnly && (
            <Button onClick={addNewItem} size="sm" disabled={isAdding || !!editingItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[120px]">Unit Price</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.position}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  {editingItem?.position === item.position ? (
                    <Input
                      value={editingItem.description || ""}
                      onChange={(e) => updateEditingItem('description', e.target.value)}
                      placeholder="Item description"
                    />
                  ) : (
                    <span className="cursor-pointer" onClick={() => !readOnly && startEdit(item)}>
                      {item.description}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingItem?.position === item.position ? (
                    <Input
                      type="number"
                      value={editingItem.quantity || ""}
                      onChange={(e) => updateEditingItem('quantity', Number(e.target.value))}
                      min="0.01"
                      step="0.01"
                    />
                  ) : (
                    <span className="cursor-pointer" onClick={() => !readOnly && startEdit(item)}>
                      {item.quantity}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingItem?.position === item.position ? (
                    <Input
                      type="number"
                      value={editingItem.unit_price || ""}
                      onChange={(e) => updateEditingItem('unit_price', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="cursor-pointer" onClick={() => !readOnly && startEdit(item)}>
                      ${item.unit_price?.toFixed(2)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <strong>${(item.amount || 0).toFixed(2)}</strong>
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    {editingItem?.position === item.position ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveItem}>Save</Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem(item.position)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            
            {/* Add new item row */}
            {isAdding && editingItem && (
              <TableRow>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <Input
                    value={editingItem.description || ""}
                    onChange={(e) => updateEditingItem('description', e.target.value)}
                    placeholder="Item description"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={editingItem.quantity || ""}
                    onChange={(e) => updateEditingItem('quantity', Number(e.target.value))}
                    min="0.01"
                    step="0.01"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={editingItem.unit_price || ""}
                    onChange={(e) => updateEditingItem('unit_price', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell>
                  <strong>${(editingItem.amount || 0).toFixed(2)}</strong>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveItem}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="mt-6 space-y-2 text-right">
          <div className="flex justify-end gap-4">
            <span>Subtotal:</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-end gap-4">
              <span>Tax ({taxRate}%):</span>
              <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-end gap-4 text-lg border-t pt-2">
            <span className="font-bold">Total:</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceItemsManager;
