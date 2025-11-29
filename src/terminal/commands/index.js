// Command Registry - loads and exports all terminal commands
// Each command module exports an object with command definitions

import { helpCommand } from './help'
import { filesystemCommands } from './filesystem'
import { audioCommands } from './audio'
import { systemCommands } from './system'
import { voidCommands } from './void'
import { executableCommands } from './executables'
import { miscCommands } from './misc'

// Merge all command modules into single commands object
export const createCommands = (context) => ({
  ...helpCommand(context),
  ...filesystemCommands(context),
  ...audioCommands(context),
  ...systemCommands(context),
  ...voidCommands(context),
  ...executableCommands(context),
  ...miscCommands(context)
})

export default createCommands
