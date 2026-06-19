import mongoose, { Schema, Document } from 'mongoose';

export type FumigationStatus = 
  | 'draft'
  | 'submitted'
  | 'guard_pending'
  | 'guard_confirmed'
  | 'dosing_pending'
  | 'evacuation_pending'
  | 'dosing_completed'
  | 'fumigating'
  | 'ventilation_pending'
  | 'ventilating'
  | 'detection_pending'
  | 'detection_passed'
  | 'guard_released'
  | 'completed'
  | 'cancelled';

export interface IFumigationPlan extends Document {
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  chemicalId: string;
  chemicalName: string;
  chemicalDosage: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  storageOperator: string;
  storageOperatorName: string;
  safetyOfficer?: string;
  safetyOfficerName?: string;
  constructionLeader?: string;
  constructionLeaderName?: string;
  status: FumigationStatus;
  statusHistory: Array<{
    status: FumigationStatus;
    operator: string;
    operatorName: string;
    timestamp: Date;
    remark?: string;
  }>;
  guardRecordId?: string;
  dosingRecordId?: string;
  ventilationRecordId?: string;
  remark: string;
  createdAt: Date;
  updatedAt: Date;
}

const FumigationPlanSchema: Schema = new Schema({
  planNo: { type: String, required: true, unique: true },
  warehouseId: { type: String, required: true },
  warehouseCode: { type: String, required: true },
  warehouseName: { type: String, required: true },
  chemicalId: { type: String, required: true },
  chemicalName: { type: String, required: true },
  chemicalDosage: { type: Number, required: true },
  plannedStartDate: { type: Date, required: true },
  plannedEndDate: { type: Date, required: true },
  actualStartDate: { type: Date, default: null },
  actualEndDate: { type: Date, default: null },
  storageOperator: { type: String, required: true },
  storageOperatorName: { type: String, required: true },
  safetyOfficer: { type: String, default: null },
  safetyOfficerName: { type: String, default: null },
  constructionLeader: { type: String, default: null },
  constructionLeaderName: { type: String, default: null },
  status: { 
    type: String, 
    enum: [
      'draft', 'submitted', 'guard_pending', 'guard_confirmed',
      'dosing_pending', 'evacuation_pending', 'dosing_completed',
      'fumigating', 'ventilation_pending', 'ventilating',
      'detection_pending', 'detection_passed', 'guard_released',
      'completed', 'cancelled'
    ], 
    default: 'draft' 
  },
  statusHistory: [{
    status: { type: String, required: true },
    operator: { type: String, required: true },
    operatorName: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    remark: { type: String, default: '' }
  }],
  guardRecordId: { type: String, default: null },
  dosingRecordId: { type: String, default: null },
  ventilationRecordId: { type: String, default: null },
  remark: { type: String, default: '' }
}, { timestamps: true });

FumigationPlanSchema.index({ warehouseId: 1, status: 1 });
FumigationPlanSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IFumigationPlan>('FumigationPlan', FumigationPlanSchema);
