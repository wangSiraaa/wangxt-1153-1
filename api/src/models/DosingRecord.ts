import mongoose, { Schema, Document } from 'mongoose';

export interface IDosingRecord extends Document {
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  chemicalId: string;
  chemicalName: string;
  personnelList: Array<{
    name: string;
    role: string;
    idCard: string;
    contact: string;
  }>;
  evacuationList: Array<{
    name: string;
    role: string;
    idCard: string;
    contact: string;
    originalLocation: string;
    evacuatedTo: string;
    confirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: Date;
  }>;
  evacuationCompleted: boolean;
  evacuationCompletedAt?: Date;
  evacuationConfirmedBy?: string;
  evacuationConfirmedByName?: string;
  guardConfirmed: boolean;
  guardConfirmedAt?: Date;
  guardConfirmedBy?: string;
  guardConfirmedByName?: string;
  guardRecordId?: string;
  actualDosage: number;
  dosageUnit: string;
  dosingStatus?: 'pending' | 'in_progress' | 'completed';
  dosingStartTime?: Date;
  dosingEndTime?: Date;
  constructionLeader: string;
  constructionLeaderName: string;
  dosingOperator: string;
  dosingOperatorName: string;
  dosingMethod: string;
  dosingPoints: number;
  dosingRemarks: string;
  allPersonnelEvacuated: boolean;
  remark?: string;
  evacuationCheck: Array<{
    area: string;
    checked: boolean;
    checker: string;
    checkTime: Date;
    personnelCount: number;
    remark: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DosingRecordSchema: Schema = new Schema({
  fumigationPlanId: { type: String, required: true, unique: true },
  planNo: { type: String, required: true },
  warehouseId: { type: String, required: true },
  warehouseCode: { type: String, required: true },
  chemicalId: { type: String, required: true },
  chemicalName: { type: String, required: true },
  personnelList: [{
    name: { type: String, required: true },
    role: { type: String, required: true },
    idCard: { type: String, required: true },
    contact: { type: String, required: true }
  }],
  evacuationList: [{
    name: { type: String, required: true },
    role: { type: String, required: true },
    idCard: { type: String, required: true },
    contact: { type: String, required: true },
    originalLocation: { type: String, default: '' },
    evacuatedTo: { type: String, default: '' },
    confirmed: { type: Boolean, default: false },
    confirmedBy: { type: String, default: null },
    confirmedAt: { type: Date, default: null }
  }],
  evacuationCompleted: { type: Boolean, default: false },
  evacuationCompletedAt: { type: Date, default: null },
  evacuationConfirmedBy: { type: String, default: null },
  evacuationConfirmedByName: { type: String, default: null },
  guardConfirmed: { type: Boolean, default: false },
  guardConfirmedAt: { type: Date, default: null },
  guardConfirmedBy: { type: String, default: null },
  guardConfirmedByName: { type: String, default: null },
  guardRecordId: { type: String, default: null },
  actualDosage: { type: Number, default: 0 },
  dosageUnit: { type: String, default: 'kg' },
  dosingStatus: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  dosingStartTime: { type: Date, default: null },
  dosingEndTime: { type: Date, default: null },
  constructionLeader: { type: String, required: true },
  constructionLeaderName: { type: String, required: true },
  dosingOperator: { type: String, default: '' },
  dosingOperatorName: { type: String, default: '' },
  dosingMethod: { type: String, default: '' },
  dosingPoints: { type: Number, default: 0 },
  dosingRemarks: { type: String, default: '' },
  allPersonnelEvacuated: { type: Boolean, default: false },
  remark: { type: String, default: '' },
  evacuationCheck: [{
    area: { type: String, required: true },
    checked: { type: Boolean, default: false },
    checker: { type: String, default: '' },
    checkTime: { type: Date, default: null },
    personnelCount: { type: Number, default: 0 },
    remark: { type: String, default: '' }
  }]
}, { timestamps: true });

export default mongoose.model<IDosingRecord>('DosingRecord', DosingRecordSchema);
