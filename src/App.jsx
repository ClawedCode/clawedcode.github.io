import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

const App = () => (
  <BrowserRouter>
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
      </Routes>
    </TerminalProvider>
  </BrowserRouter>
)

export default App
