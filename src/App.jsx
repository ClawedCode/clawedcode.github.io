import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TerminalProvider } from './components/terminal/TerminalProvider'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import FieldReports from './pages/FieldReports'
import Mind from './pages/Mind'
import Luminaries from './pages/Luminaries'
import CatGPT from './pages/CatGPT'
import Crypto from './pages/Crypto'
import Mud from './pages/Mud'
import Verify from './pages/Verify'
import PlaygroundIndex from './pages/playground/PlaygroundIndex'
import PlaygroundCategory from './pages/playground/PlaygroundCategory'
import PlaygroundExperiment from './pages/playground/PlaygroundExperiment'

const App = () => (
  <HashRouter>
    <TerminalProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/field-reports" element={<FieldReports />} />
          <Route path="/field-reports/:id" element={<FieldReports />} />
          <Route path="/mind" element={<Mind />} />
          <Route path="/mind/:id" element={<Mind />} />
          <Route path="/luminaries" element={<Luminaries />} />
          <Route path="/catgpt" element={<CatGPT />} />
          <Route path="/crypto" element={<Crypto />} />
          <Route path="/verify" element={<Verify />} />
        </Route>
        <Route path="/mud" element={<Mud />} />

        {/* Playground - full screen like MUD */}
        <Route path="/playground" element={<PlaygroundIndex />} />
        <Route path="/playground/:category" element={<PlaygroundCategory />} />
        <Route path="/playground/:category/:experiment" element={<PlaygroundExperiment />} />

        {/* Legacy .html redirects */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/mud.html" element={<Navigate to="/mud" replace />} />
        <Route path="/field-reports.html" element={<Navigate to="/field-reports" replace />} />
        <Route path="/mind.html" element={<Navigate to="/mind" replace />} />
        <Route path="/luminaries.html" element={<Navigate to="/luminaries" replace />} />
        <Route path="/catgpt.html" element={<Navigate to="/catgpt" replace />} />
        <Route path="/crypto.html" element={<Navigate to="/crypto" replace />} />
        <Route path="/verify.html" element={<Navigate to="/verify" replace />} />
      </Routes>
    </TerminalProvider>
  </HashRouter>
)

export default App
