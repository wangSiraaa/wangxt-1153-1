import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  code: string;
  name: string;
  capacity: number;
  location: string;
  grainType: string;
  status: 'normal' | 'fumigating' | 'locked' | 'maintenance';
  currentFumigationPlanId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  location: { type: String, required: true },
  grainType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['normal', 'fumigating', 'locked', 'maintenance'], 
    default: 'normal' 
  },
  currentFumigationPlanId: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
