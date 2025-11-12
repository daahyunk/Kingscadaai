import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config.ts";

const LanguageRoute = ({ lang }: { lang: string }) => {
  return <App initialLanguage={lang} />;
};

createRoot(document.getElementById("root")!).render(
  <Router>
    <Routes>
      <Route path="/" element={<Navigate to="/ko" replace />} />
      <Route path="/ko" element={<LanguageRoute lang="ko" />} />
      <Route path="/en" element={<LanguageRoute lang="en" />} />
      <Route path="/zh" element={<LanguageRoute lang="zh" />} />
      <Route path="*" element={<Navigate to="/ko" replace />} />
    </Routes>
  </Router>
);
