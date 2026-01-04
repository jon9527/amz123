import React, { useState } from 'react';
import Layout from './components/Layout';
import { AppView } from './types';
import Dashboard from './pages/Dashboard';
import ProfitCalculator from './pages/ProfitCalculator';
import AdsAnalysis from './pages/AdsAnalysis';
import PromotionAnalysis from './pages/PromotionAnalysis';
import ProductProfitList from './pages/ProductProfitList';
import PromotionDeduction from './pages/PromotionDeduction';
import ReplenishmentAdvice from './pages/ReplenishmentAdvice';
import ProductLibrary from './pages/ProductLibrary';
import { LogisticsLibrary } from './pages/LogisticsLibrary';
import SettingsPanel from './pages/SettingsPanel';
import OperationsToolbox from './pages/OperationsToolbox';
import KeywordTool from './pages/KeywordTool';
import { ProductProvider } from './ProductContext';
import { LogisticsProvider } from './LogisticsContext';
import { AuthProvider, useAuth } from './AuthContext';
import PinLockScreen from './components/PinLockScreen';
import { NAVIGATION_ITEMS } from './constants';

const AppContent: React.FC = () => {
  const { isLocked } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.PRODUCT_LIBRARY:
        return <ProductLibrary />;
      case AppView.LOGISTICS_LIBRARY:
        return <LogisticsLibrary />;
      case AppView.PROFIT:
        return <ProfitCalculator />;
      case AppView.ADS:
        return <AdsAnalysis />;
      case AppView.PROMOTION:
        return <PromotionAnalysis />;
      case AppView.SIMULATION:
        return <ProductProfitList />;
      case AppView.DEDUCTION:
        return <PromotionDeduction />;
      case AppView.REPLENISHMENT:
        return <ReplenishmentAdvice />;
      case AppView.SETTINGS:
        return <SettingsPanel />;
      case AppView.TOOLBOX:
        return <OperationsToolbox />;
      case AppView.KEYWORD:
        return <KeywordTool />;
      default:
        const label = NAVIGATION_ITEMS.find(n => n.view === currentView)?.label || currentView;
        return (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8 space-y-4">
            <div className="p-6 bg-[#111111] border border-dashed border-[#27272a] rounded-3xl flex flex-col items-center max-w-md text-center">
              <span className="material-symbols-outlined text-6xl mb-6 text-zinc-800">construction</span>
              <h3 className="text-xl font-black text-white mb-2">{label} - 正在建设中</h3>
              <p className="text-sm">我们正在努力开发此功能，以为您提供最先进的亚马逊运营数据。请期待后续更新。</p>
              <button
                onClick={() => setCurrentView(AppView.DASHBOARD)}
                className="mt-8 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20"
              >
                返回总览面板
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {isLocked && <PinLockScreen />}
      <ProductProvider>
        <LogisticsProvider>
          <Layout currentView={currentView} onViewChange={setCurrentView}>
            {renderContent()}
          </Layout>
        </LogisticsProvider>
      </ProductProvider>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

