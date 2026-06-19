import React, { useState, useEffect } from 'react';
import { Layout, Menu, App as AntApp } from 'antd';
import {
  FileTextOutlined,
  SafetyOutlined,
  MedicineBoxOutlined,
  CloudOutlined,
  DashboardOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FumigationPlans from './pages/FumigationPlans';
import GuardPage from './pages/GuardPage';
import DosingPage from './pages/DosingPage';
import VentilationPage from './pages/VentilationPage';
import PlanDetail from './pages/PlanDetail';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntApp.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser] = useState({
    id: 'user001',
    name: '张三',
    role: 'storage'
  });

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '作业概览'
    },
    {
      key: '/plans',
      icon: <FileTextOutlined />,
      label: '熏蒸计划'
    },
    {
      key: '/guard',
      icon: <SafetyOutlined />,
      label: '警戒确认'
    },
    {
      key: '/dosing',
      icon: <MedicineBoxOutlined />,
      label: '投药作业'
    },
    {
      key: '/ventilation',
      icon: <CloudOutlined />,
      label: '通风检测'
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 12 : 16,
          fontWeight: 'bold',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          <WarningOutlined style={{ marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && '熏蒸监护系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)'
        }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            粮库熏蒸作业安全监护系统
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>当前用户：{currentUser.name}</span>
            <span style={{ 
              padding: '2px 8px', 
              background: '#e6f7ff', 
              color: '#1890ff',
              borderRadius: 4,
              fontSize: 12
            }}>
              {currentUser.role === 'storage' && '仓储员'}
              {currentUser.role === 'safety' && '安环员'}
              {currentUser.role === 'construction' && '施工负责人'}
            </span>
          </div>
        </Header>
        <Content style={{ margin: '0', overflow: 'auto' }}>
          <div style={{ padding: 24, minHeight: 360 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/plans" element={<FumigationPlans />} />
              <Route path="/plans/:id" element={<PlanDetail />} />
              <Route path="/guard" element={<GuardPage />} />
              <Route path="/dosing" element={<DosingPage />} />
              <Route path="/ventilation" element={<VentilationPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
