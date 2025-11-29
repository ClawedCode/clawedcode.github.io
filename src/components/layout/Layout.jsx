import { Outlet } from 'react-router-dom'
import Header from './Header'
import TerminalFooter from '../terminal/TerminalFooter'

const Layout = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 px-4 pb-20">
      <Outlet />
    </main>
    <TerminalFooter />
  </div>
)

export default Layout
