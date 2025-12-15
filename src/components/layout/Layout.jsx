import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'
import TerminalFooter from '../terminal/TerminalFooter'

const Layout = () => (
  <div className="min-h-screen">
    <Navigation />
    <div className="min-h-screen flex flex-col md:pl-72">
      <Header />
      <main className="flex-1 px-4 pb-20">
        <Outlet />
      </main>
      <TerminalFooter />
    </div>
  </div>
)

export default Layout
