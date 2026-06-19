import { Router, Request, Response } from 'express';
import Chemical from '../models/Chemical';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const chemicals = await Chemical.find().sort({ code: 1 });
    res.json({ success: true, data: chemicals });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const chemical = await Chemical.findById(req.params.id);
    if (!chemical) {
      return res.status(404).json({ success: false, message: '药剂不存在' });
    }
    res.json({ success: true, data: chemical });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const chemical = new Chemical(req.body);
    await chemical.save();
    res.json({ success: true, data: chemical, message: '药剂创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const chemical = await Chemical.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!chemical) {
      return res.status(404).json({ success: false, message: '药剂不存在' });
    }
    res.json({ success: true, data: chemical, message: '药剂更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const chemical = await Chemical.findByIdAndDelete(req.params.id);
    if (!chemical) {
      return res.status(404).json({ success: false, message: '药剂不存在' });
    }
    res.json({ success: true, message: '药剂删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
