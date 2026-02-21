import { extract } from './extract'
import { clean } from './clean'
import { status } from './status'
import { translate } from './translate'

/**
 * CLI Entry Point for the i18n tool.
 * Parses command line arguments and dispatches to the appropriate module.
 */

const command = process.argv[2]

switch (command) {
  case 'extract':
    console.log('Starting extraction...')
    await extract()
    break

  case 'clean':
    console.log('Starting cleanup...')
    await clean()
    break

  case 'status':
    await status()
    break

  case 'translate':
    console.log('Starting AI translation...')
    await translate(process.argv[3])
    break

  case 'help':
  case '--help':
  case '-h':
    printHelp()
    break

  case undefined:
    // Default behavior can be extract, or show help.
    // Given the previous code, it was extract.
    console.log("No command specified, running 'extract'...")
    await extract()
    break

  default:
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
}

function printHelp() {
  console.log(`
Usage: bun i18n [command]

Commands:
  extract            Scans code, extracts keys, and updates JSON files.
  clean              Removes unused keys from JSON files (Config dependent).
  status             Shows translation progress and missing keys.
  translate [lang]   AI-fills untranslated keys. Optionally pass a language (e.g. tr, fr).
  help               Shows this help message.

Configuration:
  Check 'i18n/config.ts' to adjust strict/soft mode and paths.
`)
}
