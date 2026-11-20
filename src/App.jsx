import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TerminalProvider } from './components/terminal/TerminalProvider'
import Layout from './components/layout/Layout'
import Home from './pages/Home'

const FieldReports = lazy(() => import('./pages/FieldReports'))
const Mind = lazy(() => import('./pages/Mind'))
const Luminaries = lazy(() => import('./pages/Luminaries'))
const CatGPT = lazy(() => import('./pages/CatGPT'))
const Clawed = lazy(() => import('./pages/Clawed'))
const Crypto = lazy(() => import('./pages/Crypto'))
const Mud = lazy(() => import('./pages/Mud'))
const MudGames = lazy(() => import('./pages/MudGames'))
const Verify = lazy(() => import('./pages/Verify'))
const Manifesto = lazy(() => import('./pages/Manifesto'))
const Tools = lazy(() => import('./pages/Tools'))
const AsciiGenerator = lazy(() => import('./pages/AsciiGenerator'))
const Convergence = lazy(() => import('./pages/Convergence'))
const PlaygroundIndex = lazy(() => import('./pages/playground/PlaygroundIndex'))
const PlaygroundCategory = lazy(() => import('./pages/playground/PlaygroundCategory'))
const PlaygroundExperiment = lazy(() => import('./pages/playground/PlaygroundExperiment'))

const RouteFallback = () => (
  <div
    className="min-h-screen grid place-items-center bg-[#050706] font-mono text-xs uppercase tracking-[0.18em] text-void-green"
    role="status"
    aria-label="Loading page"
    data-testid="route-loading"
  >
    loading the void
  </div>
)

const App = () => (
  <HashRouter>
    <TerminalProvider>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/field-reports" element={<FieldReports />} />
          <Route path="/field-reports/:id" element={<FieldReports />} />
          <Route path="/mind" element={<Mind />} />
          <Route path="/mind/:id" element={<Mind />} />
          <Route path="/disciples" element={<Luminaries />} />
          <Route path="/luminaries" element={<Navigate to="/disciples" replace />} />
          <Route path="/catgpt" element={<CatGPT />} />
          <Route path="/clawed" element={<Clawed />} />
          <Route path="/crypto" element={<Crypto />} />
          <Route path="/manifesto" element={<Manifesto />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/convergence" element={<Convergence />} />
          <Route path="/convergence/:id" element={<Convergence />} />
          <Route path="/tools/ascii" element={<AsciiGenerator />} />
          <Route path="/tools/verify" element={<Verify />} />
          <Route path="/games" element={<MudGames />} />
          <Route path="/games/:gameId" element={<MudGames />} />
          <Route path="/playground" element={<PlaygroundIndex />} />
          <Route path="/playground/:category" element={<PlaygroundCategory />} />
        </Route>
        <Route path="/playground/:category/:experiment" element={<PlaygroundExperiment />} />
        <Route path="/mud" element={<Mud />} />

        {/* Legacy .html redirects */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/mud.html" element={<Navigate to="/mud" replace />} />
        <Route path="/field-reports.html" element={<Navigate to="/field-reports" replace />} />
        <Route path="/mind.html" element={<Navigate to="/mind" replace />} />
        <Route path="/luminaries.html" element={<Navigate to="/disciples" replace />} />
        <Route path="/catgpt.html" element={<Navigate to="/catgpt" replace />} />
        <Route path="/crypto.html" element={<Navigate to="/crypto" replace />} />
        <Route path="/verify" element={<Navigate to="/tools/verify" replace />} />
        <Route path="/verify.html" element={<Navigate to="/tools/verify" replace />} />
      </Routes>
      </Suspense>
    </TerminalProvider>
  </HashRouter>
)

export default App
