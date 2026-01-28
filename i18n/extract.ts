import { Glob } from 'bun'
import ts from 'typescript'
import { CONFIG } from './config'
import {
  type ExtractedKey,
  type HashEntry,
  type TranslationValue,
  generateSkeleton,
  mergeDeep,
  quickHash,
  loadHashes,
  saveHashes,
  loadJsonFile,
  saveJsonFile,
  getNamespaces,
  ensureNamespaceFile,
  updateIndexFile,
} from './utils'

// ============================================================================
// AST HELPER: Node to Value
// ============================================================================

type Scope = Record<string, TranslationValue>

/**
 * Extracts a primitive or complex value from a given TypeScript AST Node.
 * Supports string literals, numeric literals, boolean keywords, identifiers (from scope),
 * array literals, and object literals.
 */
function getNodeValue(node: ts.Node, sourceFile: ts.SourceFile, scope: Scope = {}): TranslationValue | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text)
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false

  if (ts.isIdentifier(node)) {
    return scope[node.text]
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => getNodeValue(el, sourceFile, scope)).filter((val): val is TranslationValue => val !== undefined)
  }

  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, TranslationValue> = {}
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : undefined
        const val = getNodeValue(prop.initializer, sourceFile, scope)
        if (key && val !== undefined) {
          obj[key] = val
        }
      }
    }
    return obj
  }

  return undefined
}

/**
 * Scans a source file for top-level variable declarations and extracts their values
 * to create a scope for resolving identifiers in `defaultValue` options.
 */
function extractFileConstants(sourceFile: ts.SourceFile): Scope {
  const scope: Scope = {}
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          const val = getNodeValue(decl.initializer, sourceFile, {})
          if (val !== undefined) {
            scope[decl.name.text] = val
          }
        }
      }
    }
  }
  return scope
}

// ============================================================================
// AST HELPER: Context Detection (Namespace Resolution)
// ============================================================================

/**
 * Scans function parameters for a specific type annotation to determine the namespace.
 * Example: (t: TFunction<'products'>)
 */
function getNamespaceFromParams(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): string | undefined {
  for (const param of node.parameters) {
    // Is parameter name 't'?
    if (ts.isIdentifier(param.name) && param.name.text === 't') {
      // Does it have a type?
      if (param.type && ts.isTypeReferenceNode(param.type)) {
        const typeName = (param.type.typeName as ts.Identifier).text
        // Is the type 'TFunction'?
        if (typeName === 'TFunction' && param.type.typeArguments && param.type.typeArguments.length > 0) {
          const firstArg = param.type.typeArguments[0]
          // Is the generic argument a string literal? <'products'>
          if (ts.isLiteralTypeNode(firstArg) && ts.isStringLiteral(firstArg.literal)) {
            return firstArg.literal.text
          }
        }
      }
    }
  }
  return undefined
}

/**
 * Scans a function body for `useTranslation` hook calls to determine the namespace.
 * Example: useTranslation(['products']) or useTranslation('products')
 */
function getNamespaceFromHook(node: ts.Block | ts.ConciseBody | ts.Expression): string | undefined {
  // Only process block statements
  if (!ts.isBlock(node)) return undefined

  for (const statement of node.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (decl.initializer && ts.isCallExpression(decl.initializer)) {
          const expr = decl.initializer.expression
          // Is it a call to useTranslation(...)?
          if (ts.isIdentifier(expr) && expr.text === 'useTranslation') {
            const args = decl.initializer.arguments
            if (args.length > 0) {
              const firstArg = args[0]

              // Case 1: useTranslation('products')
              if (ts.isStringLiteral(firstArg)) {
                return firstArg.text
              }

              // Case 2: useTranslation(['products', 'home']) -> The first one is default
              if (ts.isArrayLiteralExpression(firstArg) && firstArg.elements.length > 0) {
                const firstEl = firstArg.elements[0]
                if (ts.isStringLiteral(firstEl)) {
                  return firstEl.text
                }
              }
            }
          }
        }
      }
    }
  }
  return undefined
}

// ============================================================================
// SCANNER
// ============================================================================

/**
 * Recursive Node Visitor
 * @param activeNamespace The default namespace active in the current scope
 */
function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filePath: string,
  keys: Map<string, ExtractedKey>,
  scope: Scope,
  activeNamespace: string,
) {
  let nextNamespace = activeNamespace

  // 1. Check for Context Change (Function Parameters and Hook Calls)
  if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    // a. Namespace from parameters: (t: TFunction<'products'>)
    const paramNs = getNamespaceFromParams(node)
    if (paramNs) {
      nextNamespace = paramNs
    }
    // b. Namespace from hook: useTranslation(['products'])
    // Search within the function's body (Block)
    else if (node.body) {
      const hookNs = getNamespaceFromHook(node.body)
      if (hookNs) {
        nextNamespace = hookNs
      }
    }
  }

  // 2. Extract t("key", { defaultValue: ... })
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
    const args = node.arguments
    if (args.length >= 2) {
      const keyNode = args[0]
      const optionsNode = args[1]

      if (ts.isStringLiteral(keyNode) && ts.isObjectLiteralExpression(optionsNode)) {
        const rawKey = keyNode.text

        for (const prop of optionsNode.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text.startsWith('defaultValue')) {
            const propName = prop.name.text
            const suffix = propName === 'defaultValue' ? '' : propName.replace(/^defaultValue/, '')
            const defaultValue = getNodeValue(prop.initializer, sourceFile, scope)

            if (defaultValue !== undefined) {
              // KEY PARSING LOGIC UPDATED
              const parts = rawKey.split(':')
              let namespace = nextNamespace // Use the active context by default
              let keyPath = rawKey

              // If the key contains an explicit namespace, use it (e.g., home:title)
              if (parts.length >= 2) {
                namespace = parts[0]
                keyPath = parts.slice(1).join(':')
              }

              const finalKeyPath = `${keyPath}${suffix}`
              const fullKey = `${namespace}:${finalKeyPath}`
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1

              keys.set(fullKey, {
                namespace,
                keyPath: finalKeyPath,
                defaultValue,
                location: `${filePath}:${line}`,
              })
            }
          }
        }
      }
    }
  }

  // 3. Extract <Trans i18nKey="..." defaults="..." />
  if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
    if (ts.isIdentifier(node.tagName) && node.tagName.text === 'Trans') {
      let i18nKey: string | undefined
      let defaults: string | undefined

      node.attributes.properties.forEach((prop) => {
        if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
          if (prop.name.text === 'i18nKey' && prop.initializer && ts.isStringLiteral(prop.initializer)) {
            i18nKey = prop.initializer.text
          }
          if (prop.name.text === 'defaults' && prop.initializer && ts.isStringLiteral(prop.initializer)) {
            defaults = prop.initializer.text
          }
        }
      })

      if (i18nKey && defaults) {
        const parts = i18nKey.split(':')
        let namespace = nextNamespace
        let keyPath = i18nKey

        if (parts.length >= 2) {
          namespace = parts[0]
          keyPath = parts.slice(1).join(':')
        }

        const fullKey = `${namespace}:${keyPath}`
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1

        keys.set(fullKey, {
          namespace,
          keyPath,
          defaultValue: defaults,
          location: `${filePath}:${line}`,
        })
      }
    }
  }

  // Continue to child nodes, passing the current context (nextNamespace)
  ts.forEachChild(node, (child) => visitNode(child, sourceFile, filePath, keys, scope, nextNamespace))
}

/**
 * Scans all configured source files for translation keys.
 *
 * @returns A Map where keys are full translation keys (e.g., "namespace:keyPath")
 *          and values are ExtractedKey objects containing details about the key.
 */
export async function scanAllFiles(): Promise<Map<string, ExtractedKey>> {
  const glob = new Glob(`**/*.{${CONFIG.extensions.join(',')}}`)
  const keys = new Map<string, ExtractedKey>()

  for await (const filePath of glob.scan(CONFIG.sourceDir)) {
    const shouldIgnore = CONFIG.ignoreDirs.some((dir) => filePath.includes(dir))
    if (shouldIgnore) continue

    const fullPath = `${CONFIG.sourceDir}/${filePath}`
    const content = await Bun.file(fullPath).text()

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
    const fileScope = extractFileConstants(sourceFile)

    // Start with the default namespace (e.g., 'translation')
    visitNode(sourceFile, sourceFile, fullPath, keys, fileScope, CONFIG.defaultNamespace)
  }

  return keys
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Sets a value in a nested object structure using a dot-separated key path.
 * If intermediate objects do not exist, they are created.
 */
function setNestedValue(obj: Record<string, unknown>, keyPath: string, value: unknown) {
  const keys = keyPath.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}

/**
 * Retrieves a value from a nested object structure using a dot-separated key path.
 * Returns undefined if any part of the path is not found.
 */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const keys = keyPath.split('.')
  let current: any = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }
  return current
}

/**
 * Main function to extract translation keys, update translation files,
 * and manage hashes to track changes.
 */
export async function extract() {
  const keys = await scanAllFiles()
  const oldHashes = await loadHashes()
  const newHashes: Record<string, HashEntry> = {}

  const added: string[] = []
  const changed: string[] = []
  const namespaces = new Set<string>()

  // Process all extracted keys
  for (const [fullKey, extracted] of keys) {
    namespaces.add(extracted.namespace)
    const hash = quickHash(extracted.defaultValue)
    newHashes[fullKey] = { hash, defaultValue: extracted.defaultValue }

    const oldEntry = oldHashes[fullKey]
    if (!oldEntry) {
      added.push(fullKey)
    } else if (oldEntry.hash !== hash) {
      changed.push(fullKey)
    }
  }

  // Iterate over each language and namespace
  for (const lang of CONFIG.languages) {
    // Ensure all relevant namespace files exist for the current language
    for (const ns of namespaces) {
      await ensureNamespaceFile(lang, ns)
    }

    // Update the index file for the current language with all namespaces
    const existingNamespaces = await getNamespaces(lang)
    const allNamespaces = [...new Set([...existingNamespaces, ...namespaces])]
    await updateIndexFile(lang, allNamespaces)

    // Process each namespace file for the current language
    for (const namespace of namespaces) {
      const filePath = `${CONFIG.messagesDir}/${lang}/${namespace}.json`
      const json = await loadJsonFile(filePath)
      let fileModified = false

      for (const [fullKey, extracted] of keys) {
        if (extracted.namespace !== namespace) continue // Only process keys for the current namespace

        const isChanged = changed.includes(fullKey)
        const existingValue = getNestedValue(json, extracted.keyPath)
        const isMissing = existingValue === undefined

        if (lang === CONFIG.defaultLanguage) {
          // For the default language, update if changed or missing
          if (isChanged || isMissing) {
            setNestedValue(json, extracted.keyPath, extracted.defaultValue)
            fileModified = true
          }
        } else {
          // For other languages, generate a skeleton and merge
          const skeleton = generateSkeleton(extracted.defaultValue)
          const mergedValue = mergeDeep(existingValue as TranslationValue, skeleton)

          // Only update if the merged value is different from the existing one
          if (JSON.stringify(existingValue) !== JSON.stringify(mergedValue)) {
            setNestedValue(json, extracted.keyPath, mergedValue)
            fileModified = true
          }
        }
      }

      if (fileModified) {
        await saveJsonFile(filePath, json)
      }
    }
  }

  // Save the new hashes for the next run
  await saveHashes(newHashes)

  // Log summary of changes
  if (added.length > 0) console.log(`  + ${added.length} keys added`)
  if (changed.length > 0) console.log(`  ~ ${changed.length} keys changed`)

  return { keys }
}
