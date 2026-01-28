import type { Plugin } from 'vite'
import { spawn } from 'child_process'

function runScript(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with code ${code}`))
      }
    })

    process.on('error', (err) => {
      reject(err)
    })
  })
}

export function i18nPlugin(): Plugin {
  return {
    name: 'vite-plugin-i18n',
    configureServer(server) {
      server.bindCLIShortcuts({
        customShortcuts: [
          {
            key: 't',
            description: 'extract translations',
            action: async () => {
              server.config.logger.info('\nExtracting translations...', {
                timestamp: true,
              })
              try {
                // We use interactive "spawn" instead of "exec"
                await runScript('bun', ['run', 'i18n/index.ts', 'extract'])
              } catch (error) {
                server.config.logger.error(`Extraction failed: ${error}`)
              }
            },
          },
          {
            key: 's',
            description: 'translation status',
            action: async () => {
              console.log('\n')
              try {
                await runScript('bun', ['run', 'i18n/index.ts', 'status'])
              } catch (error) {
                console.error('Status failed:', error)
              }
            },
          },
          {
            key: 'x',
            description: 'clean unused keys',
            action: async () => {
              server.config.logger.info('\nCleaning unused keys...', {
                timestamp: true,
              })
              try {
                await runScript('bun', ['run', 'i18n/index.ts', 'clean'])
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
