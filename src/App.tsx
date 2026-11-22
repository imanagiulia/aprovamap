import React from 'react';
import { Loader2 } from 'lucide-react';
import { StudyProvider, useStudy } from './context/StudyContext';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import { QuestionBatchModal } from './components/QuestionBatchModal';
import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppShell: React.FC = () => {
  const { user, authLoading, dataLoading, activeTab } = useStudy();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Carregando AprovaMap...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Layout>
      {dataLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <p className="text-sm">Sincronizando seus estudos...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'subjects' && <SubjectsPage />}
          {activeTab === 'calendar' && <CalendarPage />}
          {activeTab === 'reviews' && <ReviewsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </>
      )}
      <QuestionBatchModal />
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <StudyProvider>
      <AppShell />
    </StudyProvider>
  );
};

export default App;
