import React, { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { WhyModal } from '../explain/WhyModal';
import { WhyExplanation } from '../../types';
import { useRetailData } from '../../hooks/useRetailData';

interface ExplainContextType {
  openWhy: (explanation: WhyExplanation) => void;
  retailData: ReturnType<typeof useRetailData>;
}

const ExplainContext = createContext<ExplainContextType | null>(null);

export const useExplain = () => {
  const context = useContext(ExplainContext);
  if (!context) {
    throw new Error('useExplain must be used within an AppLayout');
  }
  return context;
};

export const AppLayout: React.FC = () => {
  const retailData = useRetailData();
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<WhyExplanation | null>(null);

  const openWhy = (explanation: WhyExplanation) => {
    setCurrentExplanation(explanation);
    setWhyModalOpen(true);
  };

  return (
    <ExplainContext.Provider value={{ openWhy, retailData }}>
      <div className="flex min-h-screen bg-[#0c101a] text-slate-100 antialiased font-sans">
        {/* Left Sidebar */}
        <Sidebar alertCount={retailData.alerts.length} />

        {/* Right Main Container */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav
            stores={retailData.stores}
            selectedStoreId={retailData.selectedStoreId}
            onSelectStore={retailData.setSelectedStoreId}
            hasData={retailData.hasData}
            onLoadDemo={retailData.loadDemo}
            isLoading={retailData.isLoading}
            activeDataSource={retailData.activeDataSource}
            dataSourceMetadata={retailData.dataSourceMetadata}
            onClearImportedData={retailData.clearImportedData}
          />

          {/* Page Content */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>

        {/* Interactive Mathematical Explainability Modal */}
        <WhyModal
          isOpen={whyModalOpen}
          explanation={currentExplanation}
          onClose={() => setWhyModalOpen(false)}
        />
      </div>
    </ExplainContext.Provider>
  );
};
