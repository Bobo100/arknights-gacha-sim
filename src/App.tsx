import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { HomePage } from './pages/HomePage';
import { StandardGacha } from './pages/StandardGacha';
import { LimitedGacha } from './pages/LimitedGacha';
import { NotFoundPage } from './pages/Error';

function App() {
  return (
    <div className="App">
      <Router basename="/Arknights-Simulation-Card-Draw">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/standard" element={<StandardGacha />} />
          <Route path="/limited" element={<LimitedGacha />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
