import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { version } from "../package.json";
import CardBrowserPage from "./pages/CardBrowserPage";
import HelpPage from "./pages/HelpPage";
import Header from "./components/Header";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Toast from "./components/common/Toast";
import mediaCacheService from "./services/mediaCache";
import useStore from "./store";
import logger from "./utils/logger";

function App() {
  const getSetting = useStore((state) => state.getSetting);

  // initialize on app load
  useEffect(() => {
    // Initialize media cache with configured duration
    const cacheDurationHours = getSetting("mediaCacheDurationHours", 24);
    mediaCacheService.setCacheDurationHours(cacheDurationHours);

    // Clean up expired cache entries on app load
    mediaCacheService.clearExpiredCache().then((clearedCount) => {
      if (clearedCount > 0) {
        logger.debug(`Cleared ${clearedCount} expired media cache entries`);
      }
    });
  }, [getSetting]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <main className="w-full">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<CardBrowserPage />} />
                <Route path="/help" element={<HelpPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <Toast />
          <footer className="text-center py-3 text-xs text-gray-400 dark:text-gray-600">
            Made by{" "}
            <a href="https://atanas.me" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              Atanas
            </a>
            {" · "}v{version}
          </footer>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
