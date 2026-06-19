import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Warehouse from './models/Warehouse';
import Chemical from './models/Chemical';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fumigation';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    await Warehouse.deleteMany({});
    await Chemical.deleteMany({});

    const warehouses = await Warehouse.insertMany([
      {
        code: 'WH-001',
        name: '1号平房仓',
        capacity: 5000,
        location: '东区A座',
        grainType: '小麦',
        status: 'normal'
      },
      {
        code: 'WH-002',
        name: '2号平房仓',
        capacity: 4500,
        location: '东区B座',
        grainType: '玉米',
        status: 'normal'
      },
      {
        code: 'WH-003',
        name: '3号浅圆仓',
        capacity: 8000,
        location: '西区1号',
        grainType: '稻谷',
        status: 'normal'
      },
      {
        code: 'WH-004',
        name: '4号浅圆仓',
        capacity: 8000,
        location: '西区2号',
        grainType: '大豆',
        status: 'normal'
      },
      {
        code: 'WH-005',
        name: '5号立筒仓',
        capacity: 3000,
        location: '北区1号',
        grainType: '小麦',
        status: 'normal'
      }
    ]);
    console.log(`✅ 已插入 ${warehouses.length} 条仓房数据`);

    const chemicals = await Chemical.insertMany([
      {
        code: 'CHEM-001',
        name: '磷化铝',
        type: '熏蒸剂',
        unit: 'kg',
        toxicity: 'high',
        safeExposureLimit: 0.3,
        description: '常用粮食熏蒸剂，遇水产生磷化氢气体'
      },
      {
        code: 'CHEM-002',
        name: '磷化镁',
        type: '熏蒸剂',
        unit: 'kg',
        toxicity: 'high',
        safeExposureLimit: 0.3,
        description: '高效粮食熏蒸剂，产气速度快'
      },
      {
        code: 'CHEM-003',
        name: '敌敌畏',
        type: '杀虫剂',
        unit: 'L',
        toxicity: 'medium',
        safeExposureLimit: 0.1,
        description: '用于空仓消毒和防虫处理'
      },
      {
        code: 'CHEM-004',
        name: '二氧化碳',
        type: '惰性气体',
        unit: 'm³',
        toxicity: 'low',
        safeExposureLimit: 5000,
        description: '用于气调储粮，低氧杀虫'
      }
    ]);
    console.log(`✅ 已插入 ${chemicals.length} 条药剂数据`);

    console.log('\n🎉 种子数据初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    process.exit(1);
  }
};

seedData();
