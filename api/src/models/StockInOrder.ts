import mongoose, { Schema, Document } from 'mongoose';

export type StockInOrderStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface IStockInOrder extends Document {
  orderNo: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  grainType: string;
  plannedQuantity?: number;
  quantity: number;
  actualQuantity?: number;
  operator: string;
  operatorName: string;
  approver?: string;
  approverName?: string;
  approvalAt?: Date;
  operationStartAt?: Date;
  operationCompletedAt?: Date;
  status: StockInOrderStatus;
  doorAccessAttempted: boolean;
  doorAccessDenied: boolean;
  doorAccessDeniedReason: string;
  fumigationCheckPassed: boolean;
  blockedByFumigation: boolean;
  blockedFumigationPlanId?: string;
  blockedFumigationPlanNo?: string;
  blockedFumigationStatus?: string;
  blockedAt?: Date;
  fumigationBlockRemark?: string;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockInOrderSchema: Schema = new Schema({
  orderNo: { type: String, required: true, unique: true },
  warehouseId: { type: String, required: true },
  warehouseCode: { type: String, required: true },
  warehouseName: { type: String, required: true },
  grainType: { type: String, required: true },
  plannedQuantity: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  actualQuantity: { type: Number, default: 0 },
  operator: { type: String, required: true },
  operatorName: { type: String, required: true },
  approver: { type: String, default: null },
  approverName: { type: String, default: null },
  approvalAt: { type: Date, default: null },
  operationStartAt: { type: Date, default: null },
  operationCompletedAt: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['draft', 'approved', 'in_progress', 'completed', 'cancelled', 'blocked'], 
    default: 'draft' 
  },
  doorAccessAttempted: { type: Boolean, default: false },
  doorAccessDenied: { type: Boolean, default: false },
  doorAccessDeniedReason: { type: String, default: '' },
  fumigationCheckPassed: { type: Boolean, default: false },
  blockedByFumigation: { type: Boolean, default: false },
  blockedFumigationPlanId: { type: String, default: null },
  blockedFumigationPlanNo: { type: String, default: null },
  blockedFumigationStatus: { type: String, default: null },
  blockedAt: { type: Date, default: null },
  fumigationBlockRemark: { type: String, default: '' },
  remark: { type: String, default: '' }
}, { timestamps: true });

StockInOrderSchema.index({ warehouseId: 1, status: 1 });

export default mongoose.model<IStockInOrder>('StockInOrder', StockInOrderSchema);
