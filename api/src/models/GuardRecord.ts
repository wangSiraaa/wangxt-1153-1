import mongoose, { Schema, Document } from 'mongoose';

export interface IGuardRecord extends Document {
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  warningScope: string;
  warningScopeDetail: Array<{
    direction: string;
    distance: number;
    description: string;
  }>;
  warningSigns: boolean;
  warningSignsDesc: string;
  ventilationFacility: boolean;
  ventilationFacilityDesc: string;
  evacuationRoute: boolean;
  evacuationRouteDesc: string;
  emergencyEquipment: boolean;
  emergencyEquipmentDesc: string;
  guardPersonnel: Array<{
    name: string;
    position: string;
    contact: string;
    assignedZone: string;
  }>;
  safetyOfficer: string;
  safetyOfficerName: string;
  isGuardConfirmed: boolean;
  guardConfirmedAt: Date;
  guardConfirmedBy?: string;
  guardConfirmedByName?: string;
  isGuardReleased: boolean;
  guardReleasedAt?: Date;
  guardReleasedBy?: string;
  guardReleasedByName?: string;
  releaseRemark?: string;
  remarks: string;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuardRecordSchema: Schema = new Schema({
  fumigationPlanId: { type: String, required: true, unique: true },
  planNo: { type: String, required: true },
  warehouseId: { type: String, required: true },
  warehouseCode: { type: String, required: true },
  warningScope: { type: String, required: true, default: '' },
  warningScopeDetail: [{
    direction: { type: String, required: true },
    distance: { type: Number, required: true },
    description: { type: String, default: '' }
  }],
  warningSigns: { type: Boolean, required: true, default: false },
  warningSignsDesc: { type: String, default: '' },
  ventilationFacility: { type: Boolean, required: true, default: false },
  ventilationFacilityDesc: { type: String, default: '' },
  evacuationRoute: { type: Boolean, required: true, default: false },
  evacuationRouteDesc: { type: String, default: '' },
  emergencyEquipment: { type: Boolean, required: true, default: false },
  emergencyEquipmentDesc: { type: String, default: '' },
  guardPersonnel: [{
    name: { type: String, required: true },
    position: { type: String, required: true },
    contact: { type: String, required: true },
    assignedZone: { type: String, default: '' }
  }],
  safetyOfficer: { type: String, required: true },
  safetyOfficerName: { type: String, required: true },
  isGuardConfirmed: { type: Boolean, default: false },
  guardConfirmedAt: { type: Date, default: null },
  guardConfirmedBy: { type: String, default: null },
  guardConfirmedByName: { type: String, default: null },
  isGuardReleased: { type: Boolean, default: false },
  guardReleasedAt: { type: Date, default: null },
  guardReleasedBy: { type: String, default: null },
  guardReleasedByName: { type: String, default: null },
  releaseRemark: { type: String, default: '' },
  remarks: { type: String, default: '' },
  remark: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IGuardRecord>('GuardRecord', GuardRecordSchema);
