import mongoose, { Schema, Document } from 'mongoose';

export interface IChemical extends Document {
  code: string;
  name: string;
  type: string;
  unit: string;
  toxicity: 'low' | 'medium' | 'high';
  safeExposureLimit: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChemicalSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  unit: { type: String, required: true, default: 'kg' },
  toxicity: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  safeExposureLimit: { type: Number, required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IChemical>('Chemical', ChemicalSchema);
