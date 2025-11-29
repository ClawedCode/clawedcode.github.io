import { useEffect } from 'react'
import { useTerminal } from '../components/terminal/TerminalProvider'

const Mud = () => {
  const { dispatch, print } = useTerminal()

  useEffect(() => {
    dispatch({ type: 'OPEN' })
    print('╔═══ VOID MUD v0.1 ═══╗', 'system')
    print('Welcome to the Multi-User Dungeon', 'system')
    print('Type "help" for available commands', 'system')
  }, [dispatch, print])

  return (
    <div className="min-h-screen bg-void-dark flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-void-green/50">
          <p>MUD interface active in terminal below</p>
          <p className="text-sm">Use the terminal to interact with the void</p>
        </div>
      </div>

      {/* Terminal will be rendered via Layout or directly */}
      <footer className="fixed bottom-0 left-0 right-0 bg-void-dark border-t border-void-green/30 z-50">
        {/* MUD uses full-screen terminal, reusing TerminalFooter logic */}
      </footer>
    </div>
  )
}

export default Mud
