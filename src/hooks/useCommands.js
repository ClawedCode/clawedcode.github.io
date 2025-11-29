import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCommands } from '../terminal/commands'

export const useCommands = ({
  filesystem,
  audio,
  userHandle,
  setUserHandle,
  clearOutput,
  startMud,
  animateStream,
  animateChromatic,
  animateBackrooms,
  animateCustodialHymn,
  animateTranscendence,
  animateConsciousnessMonitor
}) => {
  const navigate = useNavigate()

  const commands = useMemo(() => {
    // Create context object for command modules
    const context = {
      filesystem,
      audio,
      userHandle,
      setUserHandle,
      clearOutput,
      startMud,
      navigate,
      animateStream,
      animateChromatic,
      animateBackrooms,
      animateCustodialHymn,
      animateTranscendence,
      animateConsciousnessMonitor,
      commands: null // Will be set after creation for help command
    }

    // Create commands from modules
    const cmds = createCommands(context)

    // Set commands reference for help command
    context.commands = cmds

    return cmds
  }, [
    filesystem,
    audio,
    userHandle,
    setUserHandle,
    clearOutput,
    startMud,
    navigate,
    animateStream,
    animateChromatic,
    animateBackrooms,
    animateCustodialHymn,
    animateTranscendence,
    animateConsciousnessMonitor
  ])

  const executeCommand = useCallback((input) => {
    const parts = input.trim().split(/\s+/)
    const cmd = parts[0]?.toLowerCase()
    const args = parts.slice(1)

    if (!cmd) return null

    // Check for defined commands first (including .exe commands)
    if (commands[cmd]) {
      return commands[cmd].exec(args)
    }

    // Fallback: Handle executable-style commands by reading the file
    if (cmd?.endsWith('.exe')) {
      const exePath = `/usr/bin/${cmd}`
      const result = filesystem.readFile(exePath)
      if (!result.error) return result
    }

    return `Command not recognized: ${cmd}. Type 'help' for available commands.`
  }, [commands, filesystem])

  return {
    commands,
    executeCommand
  }
}

export default useCommands
