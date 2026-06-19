import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Select, 
  Input, 
  DatePicker, 
  InputNumber,
  App,
  Card,
  Row,
  Col
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { fumigationPlanApi, warehouseApi, chemicalApi } from '../api';
import type { FumigationPlan, Warehouse, Chemical, FumigationStatus } from '../types';
import { statusMap } from '../types';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const FumigationPlans: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [plans, setPlans] = useState<FumigationPlan[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FumigationPlan | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<FumigationStatus | ''>('');

  const loadPlans = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await fumigationPlanApi.getList({
        status: statusFilter || undefined,
        page,
        pageSize
      });
      if (res.success && res.data) {
        setPlans(res.data);
        setPagination({
          current: page,
          pageSize,
          total: res.pagination?.total || res.data.length
        });
      }
    } catch (error) {
      message.error('加载计划列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBaseData = async () => {
    try {
      const [whRes, chemRes] = await Promise.all([
        warehouseApi.getList(),
        chemicalApi.getList()
      ]);
      if (whRes.success && whRes.data) {
        setWarehouses(whRes.data.filter(w => w.status === 'normal'));
      }
      if (chemRes.success && chemRes.data) {
        setChemicals(chemRes.data);
      }
    } catch (error) {
      message.error('加载基础数据失败');
    }
  };

  useEffect(() => {
    loadPlans();
    loadBaseData();
  }, [statusFilter]);

  const handleSubmit = async (values: any) => {
    try {
      const planData = {
        ...values,
        warehouseId: values.warehouse.value,
        warehouseCode: values.warehouse.label.split(' - ')[0],
        warehouseName: values.warehouse.label.split(' - ')[1],
        chemicalId: values.chemical.value,
        chemicalName: values.chemical.label,
        plannedStartDate: values.dateRange[0].toISOString(),
        plannedEndDate: values.dateRange[1].toISOString(),
        storageOperator: 'user001',
        storageOperatorName: '张三'
      };

      delete planData.warehouse;
      delete planData.chemical;
      delete planData.dateRange;

      if (editingPlan) {
        await fumigationPlanApi.update(editingPlan._id, planData);
        message.success('计划更新成功');
      } else {
        await fumigationPlanApi.create(planData);
        message.success('计划创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      loadPlans(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = (plan: FumigationPlan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      warehouse: {
        value: plan.warehouseId,
        label: `${plan.warehouseCode} - ${plan.warehouseName}`
      },
      chemical: {
        value: plan.chemicalId,
        label: plan.chemicalName
      },
      chemicalDosage: plan.chemicalDosage,
      dateRange: [dayjs(plan.plannedStartDate), dayjs(plan.plannedEndDate)],
      remark: plan.remark
    });
    setModalVisible(true);
  };

  const handleDelete = (plan: FumigationPlan) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除熏蒸计划 ${plan.planNo} 吗？`,
      onOk: async () => {
        try {
          await fumigationPlanApi.delete(plan._id);
          message.success('删除成功');
          loadPlans(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.response?.data?.message || '删除失败');
        }
      }
    });
  };

  const handleSubmitPlan = async (plan: FumigationPlan) => {
    modal.confirm({
      title: '确认提交',
      content: `确定要提交熏蒸计划 ${plan.planNo} 吗？提交后将进入流程审批。`,
      onOk: async () => {
        try {
          await fumigationPlanApi.submit(plan._id, {
            operator: 'user001',
            operatorName: '张三'
          });
          message.success('提交成功');
          loadPlans(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.response?.data?.message || '提交失败');
        }
      }
    });
  };

  const handleStartProcess = async (plan: FumigationPlan) => {
    modal.confirm({
      title: '启动熏蒸流程',
      content: (
        <div>
          <p>确定要启动熏蒸计划 <strong>{plan.planNo}</strong> 吗？</p>
          <p className="warning-text">启动后，仓房 {plan.warehouseName} 将被锁定，禁止普通入库作业！</p>
        </div>
      ),
      onOk: async () => {
        try {
          await fumigationPlanApi.startProcess(plan._id, {
            operator: 'user001',
            operatorName: '张三'
          });
          message.success('熏蒸流程已启动，仓房已锁定');
          loadPlans(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.response?.data?.message || '启动失败');
        }
      }
    });
  };

  const columns: ColumnsType<FumigationPlan> = [
    {
      title: '计划编号',
      dataIndex: 'planNo',
      key: 'planNo',
      width: 160,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '仓房',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 120
    },
    {
      title: '药剂',
      dataIndex: 'chemicalName',
      key: 'chemicalName',
      width: 100
    },
    {
      title: '用药量',
      dataIndex: 'chemicalDosage',
      key: 'chemicalDosage',
      width: 80,
      render: (val) => `${val} kg`
    },
    {
      title: '计划周期',
      key: 'period',
      width: 220,
      render: (_, record) => (
        <div>
          <div>开始: {dayjs(record.plannedStartDate).format('YYYY-MM-DD')}</div>
          <div>结束: {dayjs(record.plannedEndDate).format('YYYY-MM-DD')}</div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: FumigationStatus) => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: '仓储员',
      dataIndex: 'storageOperatorName',
      key: 'storageOperatorName',
      width: 80
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/plans/${record._id}`)}
          >
            详情
          </Button>
          {record.status === 'draft' && (
            <>
              <Button 
                type="link" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Button 
                type="link" 
                size="small" 
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDelete(record)}
              >
                删除
              </Button>
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmitPlan(record)}
              >
                提交
              </Button>
            </>
          )}
          {record.status === 'submitted' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartProcess(record)}
            >
              启动流程
            </Button>
          )}
        </Space>
      )
    }
  ];

  const warehouseOptions = warehouses.map(w => ({
    value: w._id,
    label: `${w.code} - ${w.name}`
  }));

  const chemicalOptions = chemicals.map(c => ({
    value: c._id,
    label: c.name
  }));

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>熏蒸计划管理</h2>
          <p style={{ color: '#666', marginTop: 4 }}>仓储员创建和管理熏蒸作业计划</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingPlan(null);
          form.resetFields();
          setModalVisible(true);
        }}>
          新建计划
        </Button>
      </div>

      <Card className="page-content">
        <Space style={{ marginBottom: 16 }}>
          <span>状态筛选：</span>
          <Select
            style={{ width: 160 }}
            placeholder="全部状态"
            allowClear
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
          >
            {Object.entries(statusMap).map(([key, val]) => (
              <Select.Option key={key} value={key}>{val.label}</Select.Option>
            ))}
          </Select>
          <Button onClick={() => { setStatusFilter(''); loadPlans(); }}>重置</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={plans}
          loading={loading}
          rowKey="_id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => loadPlans(page, pageSize)
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingPlan ? '编辑熏蒸计划' : '新建熏蒸计划'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            storageOperator: 'user001',
            storageOperatorName: '张三'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="warehouse"
                label="选择仓房"
                rules={[{ required: true, message: '请选择仓房' }]}
              >
                <Select
                  labelInValue
                  placeholder="请选择仓房"
                  options={warehouseOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="chemical"
                label="选择药剂"
                rules={[{ required: true, message: '请选择药剂' }]}
              >
                <Select
                  labelInValue
                  placeholder="请选择药剂"
                  options={chemicalOptions}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="chemicalDosage"
                label="用药量 (kg)"
                rules={[{ required: true, message: '请输入用药量' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="熏蒸周期"
                rules={[{ required: true, message: '请选择熏蒸周期' }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingPlan ? '保存修改' : '创建计划'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FumigationPlans;
