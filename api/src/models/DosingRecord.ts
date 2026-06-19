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
  evacuationCompleted: boolean;
  evacuationCompletedAt?: Date;
  evacuationConfirmedBy?: string;
  evacuationConfirmedByName?: string;
  actualDosage: number;
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
  evacuationCheck: Array<{
    area: string;
    checked: boolean;
    checker: string;
    checkTime: Date;
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
  evacuationCompleted: { type: Boolean, default: false },
  evacuationCompletedAt: { type: Date, default: null },
  evacuationConfirmedBy: { type: String, default: null },
  evacuationConfirmedByName: { type: String, default: null },
  actualDosage: { type: Number, default: 0 },
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
  evacuationCheck: [{
    area: { type: String, required: true },
    checked: { type: Boolean, default: false },
    checker: { type: String, required: true },
    checkTime: { type: Date, required: true, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model<IDosingRecord>('DosingRecord', DosingRecordSchema);
