import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Phase1Page from './pages/Phase1Page';
import Phase2Page from './pages/Phase2Page';
import Phase3Page from './pages/Phase3Page';
import Phase4Page from './pages/Phase4Page';
import ReviewPage from './pages/ReviewPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import BoundingBoxViewer from './components/BoundingBoxViewer';

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    user_id: 'usr-research-01',
    email: 'anita.biologist@pench-wildlife.org',
    display_name: 'Dr. Anita Roy (Lead Biologist)',
    role: 'RESEARCHER'
  });

  const [activePage, setActivePage] = useState('dashboard');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFilename, setCurrentFilename] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [openAlertCount, setOpenAlertCount] = useState(0);

  // Check auth profile & alerts on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data && data.user_id) setCurrentUser(data);
      })
      .catch(() => {});

    fetch('/api/movement/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOpenAlertCount(data.length);
      })
      .catch(() => {});
  }, []);

  const handleStartProcessing = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setCurrentIndex(0);

    const newResults = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setCurrentIndex(i + 1);
      setCurrentFilename(file.name);

      const formData = new FormData();
      formData.append('file', file);
      // Randomly associate with one of Pench camera stations
      const camIds = ['CAM-PNC-01', 'CAM-PNC-02', 'CAM-PNC-03', 'CAM-PNC-04', 'CAM-PNC-05', 'CAM-PNC-06'];
      const chosenCam = camIds[i % camIds.length];
      formData.append('camera_id', chosenCam);

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `Server error processing ${file.name}`);
        }

        const data = await response.json();
        newResults.push(data);
      } catch (err) {
        console.error(`Error analyzing ${file.name}:`, err);
        setError(`Failed to analyze ${file.name}: ${err.message}`);
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setIsProcessing(false);
    setSelectedFiles([]);

    // Update alert count
    fetch('/api/movement/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOpenAlertCount(data.length);
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    setActivePage('login');
  };

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    setActivePage('dashboard');
  };

  if (activePage === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#05150f] text-[#f5f2eb] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Platform Command Center Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        currentUser={currentUser}
        onLogout={handleLogout}
        openAlertCount={openAlertCount}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activePage === 'dashboard' && (
          <DashboardPage setActivePage={setActivePage} results={results} />
        )}

        {activePage === 'phase-1' && (
          <Phase1Page
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            handleStartProcessing={handleStartProcessing}
            isProcessing={isProcessing}
            currentIndex={currentIndex}
            currentFilename={currentFilename}
            error={error}
            results={results}
            onSelectResult={setSelectedResult}
          />
        )}

        {activePage === 'phase-2' && (
          <Phase2Page
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            handleStartProcessing={handleStartProcessing}
            isProcessing={isProcessing}
            currentIndex={currentIndex}
            currentFilename={currentFilename}
            error={error}
            results={results}
            onSelectResult={setSelectedResult}
          />
        )}

        {activePage === 'phase-3' && (
          <Phase3Page
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            handleStartProcessing={handleStartProcessing}
            isProcessing={isProcessing}
            currentIndex={currentIndex}
            currentFilename={currentFilename}
            error={error}
            results={results}
            onSelectResult={setSelectedResult}
          />
        )}

        {activePage === 'phase-4' && (
          <Phase4Page currentUser={currentUser} results={results} />
        )}

        {activePage === 'review' && (
          <ReviewPage currentUser={currentUser} />
        )}

        {activePage === 'settings' && (
          <SettingsPage currentUser={currentUser} />
        )}

        {activePage === 'admin' && (
          <AdminPage currentUser={currentUser} />
        )}

        {/* Modal Result Inspector */}
        {selectedResult && (
          <BoundingBoxViewer result={selectedResult} onClose={() => setSelectedResult(null)} />
        )}
      </main>
    </div>
  );
}
