import type { Plugin } from 'vite'
import { spawn } from 'child_process'

/**
 * Executes a shell command asynchronously and streams the output.
 * Used to trigger the 'bun i18n' CLI from within Vite.
 */
function runScript(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit', // Pipes output directly to the console
      shell: true,
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" failed with code ${code}`))
      }
    })

    process.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Vite Plugin to integrate i18n tools into the development workflow.
 * Adds custom keyboard shortcuts to the Vite CLI.
 */
export function i18nPlugin(): Plugin {
  return {
    name: 'vite-plugin-i18n',
    configureServer(server) {
      // Log initialization
      server.config.logger.info("\n  🌐 i18n Plugin Active: Press 't' to extract, 's' for status, 'x' to clean.\n", {
        timestamp: true,
        clear: false,
      })

      server.bindCLIShortcuts({
        customShortcuts: [
          {
            key: 't',
            description: 'extract translations',
            action: async () => {
              server.config.logger.info('Extracting translations...', {
                timestamp: true,
              })
              try {
                // Runs: bun run i18n/index.ts extract
                await runScript('bun', ['run', 'i18n/index.ts', 'extract'])
                server.config.logger.info('Extraction complete.', { timestamp: true })
              } catch (error) {
                server.config.logger.error(`Extraction failed: ${error}`)
              }
            },
          },
          {
            key: 's',
            description: 'translation status',
            action: async () => {
              console.log('\n') // Spacing
              try {
                // Runs: bun run i18n/index.ts status
                await runScript('bun', ['run', 'i18n/index.ts', 'status'])
              } catch (error) {
                console.error('Status check failed:', error)
              }
              console.log('\n')
            },
          },
          {
            key: 'x',
            description: 'clean unused keys',
            action: async () => {
              server.config.logger.info('Cleaning unused keys...', {
                timestamp: true,
              })
              try {
                // Runs: bun run i18n/index.ts clean
                await runScript('bun', ['run', 'i18n/index.ts', 'clean'])
                server.config.logger.info('Cleanup complete.', { timestamp: true })
              } catch (error) {
                server.config.logger.error(`Clean failed: ${error}`)
              }
            },
          },
        ],
      })
    },
  }
}
