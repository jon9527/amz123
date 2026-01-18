import React, { useState, useEffect, Suspense } from 'react';
import Layout from './components/Layout';
import { AppView } from './types';
import Dashboard from './pages/Dashboard';
import { ProductProvider } from './contexts/ProductContext';
import { LogisticsProvider } from './contexts/LogisticsContext';
import { OperationsProvider } from './contexts/OperationsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ExchangeRateProvider } from './contexts/ExchangeRateContext';
import PinLockScreen from './components/PinLockScreen';
import { NAVIGATION_ITEMS } from './constants';
import { MigrationService } from './services/MigrationService';

// Lazy load heavy components for code splitting
const ProfitCalculator = React.lazy(() => import('./pages/ProfitCalculator'));
const AdsAnalysis = React.lazy(() => import('./pages/AdsAnalysis'));
const PromotionAnalysis = React.lazy(() => import('./pages/PromotionAnalysis'));
const ProductProfitList = React.lazy(() => import('./pages/ProductProfitList'));
const PromotionDeduction = React.lazy(() => import('./pages/PromotionDeduction'));
const ReplenishmentAdvice = React.lazy(() => import('./pages/ReplenishmentAdvice'));
const ProductLibrary = React.lazy(() => import('./pages/ProductLibrary'));
const LogisticsLibrary = React.lazy(() => import('./pages/LogisticsLibrary'));
const SettingsPanel = React.lazy(() => import('./pages/SettingsPanel'));
const OperationsToolbox = React.lazy(() => import('./pages/OperationsToolbox'));
const KeywordTool = React.lazy(() => import('./pages/KeywordTool'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-zinc-500 text-sm font-bold">加载中...</span>
    </div>
  </div>
);


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
      {/* DEV: PIN disabled for local testing */}
      {false && isLocked && <PinLockScreen />}
      <ExchangeRateProvider>
        <ProductProvider>
          <LogisticsProvider>
            <OperationsProvider>
              <Layout currentView={currentView} onViewChange={setCurrentView}>
                <Suspense fallback={<PageLoader />}>
                  {renderContent()}
                </Suspense>
              </Layout>
            </OperationsProvider>
          </LogisticsProvider>
        </ProductProvider>
      </ExchangeRateProvider>
    </>
  );
};

const App: React.FC = () => {
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Run migration on app startup
  useEffect(() => {
    if (MigrationService.needsMigration()) {
      console.log('[App] Migration needed, starting...');
      const result = MigrationService.migrate();

      if (result.success) {
        console.log('[App] Migration successful:', result);
      } else {
        console.warn('[App] Migration had errors:', result);
        // 不阻止应用启动，但记录错误
      }
    } else {
      console.log('[App] No migration needed');
    }
    setMigrationComplete(true);
  }, []);

  // 等待迁移完成后再渲染
  if (!migrationComplete) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-500 text-sm font-bold">正在检查数据...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

