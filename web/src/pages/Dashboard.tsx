import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Button, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  FileTextOutlined, 
  SafetyOutlined, 
  MedicineBoxOutlined, 
  CloudOutlined,
  ArrowRightOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { fumigationPlanApi, doorControlApi } from '../api';
import type { FumigationPlan } from '../types';
import { statusMap } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    fumigating: 0,
    completed: 0
  });
  const [recentPlans, setRecentPlans] = useState<FumigationPlan[]>([]);
  const [fumigatingWarehouses, setFumigatingWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, warehousesRes] = await Promise.all([
        fumigationPlanApi.getList({ pageSize: 5 }),
        doorControlApi.getFumigatingWarehouses()
      ]);

      if (plansRes.success && plansRes.data) {
        setRecentPlans(plansRes.data);
        const allPlans = plansRes.data;
        setStats({
          total: plansRes.pagination?.total || allPlans.length,
          pending: allPlans.filter(p => ['draft', 'submitted', 'guard_pending', 'dosing_pending', 'evacuation_pending'].includes(p.status)).length,
          fumigating: allPlans.filter(p => ['fumigating', 'ventilating', 'detection_pending'].includes(p.status)).length,
          completed: allPlans.filter(p => p.status === 'completed').length
        });
      }

      if (warehousesRes.success && warehousesRes.data) {
        setFumigatingWarehouses(warehousesRes.data as any[]);
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    { 
      title: '总计划数', 
      value: stats.total, 
      icon: <FileTextOutlined />, 
      color: 'info',
      path: '/plans'
    },
    { 
      title: '待处理', 
      value: stats.pending, 
      icon: <SafetyOutlined />, 
      color: 'warning',
      path: '/plans?status=pending'
    },
    { 
      title: '熏蒸中', 
      value: stats.fumigating, 
      icon: <MedicineBoxOutlined />, 
      color: 'danger',
      path: '/plans?status=fumigating'
    },
    { 
      title: '已完成', 
      value: stats.completed, 
      icon: <CloudOutlined />, 
      color: 'success',
      path: '/plans?status=completed'
    }
  ];

  const columns = [
    {
      title: '计划编号',
      dataIndex: 'planNo',
      key: 'planNo',
      render: (text: string) => <a onClick={() => navigate(`/plans/${recentPlans.find(p => p.planNo === text)?._id}`)}>{text}</a>
    },
    {
      title: '仓房',
      dataIndex: 'warehouseName',
      key: 'warehouseName'
    },
    {
      title: '药剂',
      dataIndex: 'chemicalName',
      key: 'chemicalName'
    },
    {
      title: '计划日期',
      dataIndex: 'plannedStartDate',
      key: 'plannedStartDate',
      render: (text: string) => new Date(text).toLocaleDateString('zh-CN')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = statusMap[status as keyof typeof statusMap];
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FumigationPlan) => (
        <Button type="link" onClick={() => navigate(`/plans/${record._id}`)}>
          查看详情 <ArrowRightOutlined />
        </Button>
      )
    }
  ];

  const warehouseColumns = [
    {
      title: '仓房编号',
      dataIndex: 'warehouseCode',
      key: 'warehouseCode'
    },
    {
      title: '仓房名称',
      dataIndex: 'warehouseName',
      key: 'warehouseName'
    },
    {
      title: '关联计划',
      dataIndex: 'planNo',
      key: 'planNo'
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = statusMap[status as keyof typeof statusMap];
        return <Tag color={info?.color || 'default'}>{info?.label || status}</Tag>;
      }
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (text: string) => new Date(text).toLocaleString('zh-CN')
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>熏蒸作业概览</h2>
        <p style={{ color: '#666', marginTop: 4 }}>实时监控熏蒸作业全流程状态</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card 
              className={`stat-card ${card.color}`}
              hoverable
              onClick={() => navigate(card.path)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.title}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {fumigatingWarehouses.length > 0 && (
        <div className="page-content" style={{ marginBottom: 24 }}>
          <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: '#ff4d4f' }} />
            正在熏蒸作业的仓房（仓门已锁定，禁止入库）
          </div>
          <Table
            size="small"
            dataSource={fumigatingWarehouses}
            columns={warehouseColumns}
            pagination={false}
            rowKey="_id"
          />
        </div>
      )}

      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="detail-section-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
            最近熏蒸计划
          </div>
          <Button type="primary" onClick={() => navigate('/plans')}>
            查看全部 <ArrowRightOutlined />
          </Button>
        </div>
        <Table
          size="middle"
          dataSource={recentPlans}
          columns={columns}
          loading={loading}
          pagination={false}
          rowKey="_id"
        />
      </div>
    </div>
  );
};

export default Dashboard;
