import mongoose, { Schema, Document } from 'mongoose';

export type StockInOrderStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export interface IStockInOrder extends Document {
  orderNo: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  grainType: string;
  quantity: number;
  operator: string;
  operatorName: string;
  status: StockInOrderStatus;
  doorAccessAttempted: boolean;
  doorAccessDenied: boolean;
  doorAccessDeniedReason: string;
  fumigationCheckPassed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockInOrderSchema: Schema = new Schema({
  orderNo: { type: String, required: true, unique: true },
  warehouseId: { type: String, required: true },
  warehouseCode: { type: String, required: true },
  warehouseName: { type: String, required: true },
  grainType: { type: String, required: true },
  quantity: { type: Number, required: true },
  operator: { type: String, required: true },
  operatorName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'approved', 'in_progress', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  doorAccessAttempted: { type: Boolean, default: false },
  doorAccessDenied: { type: Boolean, default: false },
  doorAccessDeniedReason: { type: String, default: '' },
  fumigationCheckPassed: { type: Boolean, default: false }
}, { timestamps: true });

StockInOrderSchema.index({ warehouseId: 1, status: 1 });

export default mongoose.model<IStockInOrder>('StockInOrder', StockInOrderSchema);
