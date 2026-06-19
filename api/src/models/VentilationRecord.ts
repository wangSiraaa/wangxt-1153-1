import mongoose, { Schema, Document } from 'mongoose';

export interface IVentilationRecord extends Document {
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  ventilationStartTime?: Date;
  ventilationEndTime?: Date;
  ventilationMethod: string;
  ventilationOperator: string;
  ventilationOperatorName: string;
  detectionRecords: Array<{
    detectionTime: Date;
    detector: string;
    detectorName: string;
    gasConcentration: number;
    detectionLocation: string;
    isQualified: boolean;
    remark: string;
  }>;
  finalConcentration: number;
  isQualified: boolean;
  qualifiedAt?: Date;
  qualifiedBy?: string;
  qualifiedByName?: string;
  safetyOfficer: string;
  safetyOfficerName: string;
  ventilationRemarks: string;
  createdAt: Date;
  updatedAt: Date;
}

const VentilationRecordSchema: Schema = new Schema({
  fumigationPlanId: { type: String, required: true, unique: true },
  planNo: { type: String, required: true },
  warehouseId: { type: String, required: true },
  warehouseCode: { type: String, required: true },
  ventilationStartTime: { type: Date, default: null },
  ventilationEndTime: { type: Date, default: null },
  ventilationMethod: { type: String, default: '' },
  ventilationOperator: { type: String, default: '' },
  ventilationOperatorName: { type: String, default: '' },
  detectionRecords: [{
    detectionTime: { type: Date, required: true, default: Date.now },
    detector: { type: String, required: true },
    detectorName: { type: String, required: true },
    gasConcentration: { type: Number, required: true },
    detectionLocation: { type: String, required: true },
    isQualified: { type: Boolean, required: true, default: false },
    remark: { type: String, default: '' }
  }],
  finalConcentration: { type: Number, default: 0 },
  isQualified: { type: Boolean, default: false },
  qualifiedAt: { type: Date, default: null },
  qualifiedBy: { type: String, default: null },
  qualifiedByName: { type: String, default: null },
  safetyOfficer: { type: String, default: '' },
  safetyOfficerName: { type: String, default: '' },
  ventilationRemarks: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IVentilationRecord>('VentilationRecord', VentilationRecordSchema);
