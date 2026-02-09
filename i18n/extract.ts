import { Glob } from 'bun'
import ts from 'typescript'
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
import { CONFIG } from './config'

// ============================================================================
// PART 1: AST VALUE EXTRACTION (Reading values from code)
// ============================================================================

type Scope = Record<string, TranslationValue>

/**
 * Extracts a primitive or complex value from a given TypeScript AST Node.
 * Used to resolve 'defaultValue' in translation calls.
 * * Supports:
 * - Primitives (String, Number, Boolean)
 * - Identifiers (resolved from the file scope)
 * - Arrays and Objects (recursive)
 * * @param node - The AST node to evaluate.
 * @param sourceFile - The source file (for line numbers/text).
 * @param scope - A map of constant variables defined in the file.
 */
function getNodeValue(node: ts.Node, sourceFile: ts.SourceFile, scope: Scope = {}): TranslationValue | undefined {
  // String Literals
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }

  // Numeric Literals
  if (ts.isNumericLiteral(node)) {
    return Number(node.text)
  }

  // Booleans
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false

  // Identifiers (Variables)
  if (ts.isIdentifier(node)) {
    return scope[node.text]
  }

  // Arrays: [1, "two", ...]
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => getNodeValue(el, sourceFile, scope)).filter((val): val is TranslationValue => val !== undefined)
  }

  // Objects: { key: "value" }
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
 * Scans a source file for top-level variable declarations.
 * It builds a "scope" so that if you use `const title = "Hello"; t(title)`,
 * we can resolve "Hello".
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
// PART 2: CONTEXT DETECTION (Determining the active namespace)
// ============================================================================

/**
 * Helper to extract namespace string from a TFunction type node.
 * Matches: TFunction<'namespace'>
 */
function extractNamespaceFromTFunction(typeNode: ts.TypeNode): string | undefined {
  if (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === 'TFunction' &&
    typeNode.typeArguments &&
    typeNode.typeArguments.length > 0
  ) {
    const firstArg = typeNode.typeArguments[0]
    if (ts.isLiteralTypeNode(firstArg) && ts.isStringLiteral(firstArg.literal)) {
      return firstArg.literal.text
    }
  }
  return undefined
}

/**
 * Analyzes function parameters to see if a specific namespace is injected.
 * * Supports:
 * 1. (t: TFunction<'ns'>)
 * 2. ({ t }: { t: TFunction<'ns'> })
 * 3. ({ t }: Props) where Props has t: TFunction<'ns'>
 */
function getNamespaceFromParams(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  sourceFile: ts.SourceFile,
): string | undefined {
  // Collect type aliases locally to resolve interfaces/types
  const typeAliases = new Map<string, ts.TypeNode>()
  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      typeAliases.set(statement.name.text, statement.type)
    }
  }

  for (const param of node.parameters) {
    // Pattern 1: Direct identifier (t: ...)
    if (ts.isIdentifier(param.name) && param.name.text === 't' && param.type) {
      const ns = extractNamespaceFromTFunction(param.type)
      if (ns) return ns
    }

    // Pattern 2: Destructuring ({ t }: ...)
    if (ts.isObjectBindingPattern(param.name)) {
      const hasT = param.name.elements.some((el) => ts.isIdentifier(el.name) && el.name.text === 't')

      if (hasT && param.type) {
        let resolvedType = param.type

        // Resolve Type Reference (e.g., Props)
        if (ts.isTypeReferenceNode(param.type) && ts.isIdentifier(param.type.typeName)) {
          const aliasName = param.type.typeName.text
          const aliasType = typeAliases.get(aliasName)
          if (aliasType) resolvedType = aliasType
        }

        // Check inside TypeLiteral
        if (ts.isTypeLiteralNode(resolvedType)) {
          for (const member of resolvedType.members) {
            if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name) && member.name.text === 't' && member.type) {
              const ns = extractNamespaceFromTFunction(member.type)
              if (ns) return ns
            }
          }
        }
      }
    }
  }
  return undefined
}

/**
 * Checks if `useTranslation` hook is called at the beginning of a function block.
 * Returns the namespace if found.
 * Example: useTranslation('common') -> 'common'
 */
function getNamespaceFromHook(node: ts.Block | ts.ConciseBody | ts.Expression): string | undefined {
  if (!ts.isBlock(node)) return undefined

  for (const statement of node.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (decl.initializer && ts.isCallExpression(decl.initializer)) {
          const expr = decl.initializer.expression
          if (ts.isIdentifier(expr) && expr.text === 'useTranslation') {
            const args = decl.initializer.arguments
            if (args.length > 0) {
              const firstArg = args[0]

              // String Literal
              if (ts.isStringLiteral(firstArg)) return firstArg.text

              // Array Literal ['ns1', 'ns2'] -> takes first
              if (ts.isArrayLiteralExpression(firstArg) && firstArg.elements.length > 0) {
                const firstEl = firstArg.elements[0]
                if (ts.isStringLiteral(firstEl)) return firstEl.text
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
// PART 3: VISITOR & EXTRACTION LOGIC
// ============================================================================

/**
 * Processes a `t("key", { ... })` call expression.
 */
function processTranslationCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
  keys: Map<string, ExtractedKey>,
  scope: Scope,
  activeNamespace: string,
) {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 't') return

  const args = node.arguments
  if (args.length < 2) return

  const keyNode = args[0]
  const optionsNode = args[1]

  if (ts.isStringLiteral(keyNode) && ts.isObjectLiteralExpression(optionsNode)) {
    const rawKey = keyNode.text

    // Iterate over options to find 'defaultValue'
    for (const prop of optionsNode.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text.startsWith('defaultValue') // Matches defaultValue or defaultValue_something
      ) {
        const propName = prop.name.text
        const suffix = propName === 'defaultValue' ? '' : propName.replace(/^defaultValue/, '')
        const defaultValue = getNodeValue(prop.initializer, sourceFile, scope)

        if (defaultValue !== undefined) {
          // Resolve namespace vs key path
          const parts = rawKey.split(':')
          let namespace = activeNamespace
          let keyPath = rawKey

          // Explicit namespace in key (e.g. "home:title") overrides context
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

/**
 * Processes a `<Trans i18nKey="..." defaults="..." />` JSX element.
 */
function processTransComponent(
  node: ts.JsxSelfClosingElement | ts.JsxOpeningElement,
  sourceFile: ts.SourceFile,
  filePath: string,
  keys: Map<string, ExtractedKey>,
  activeNamespace: string,
) {
  if (!ts.isIdentifier(node.tagName) || node.tagName.text !== 'Trans') return

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
    let namespace = activeNamespace
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

/**
 * Main recursive visitor function.
 * It traverses the AST and updates the `keys` map.
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

  // 1. Detect Context Switch (Function param or Hook)
  if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const paramNs = getNamespaceFromParams(node, sourceFile)
    if (paramNs) {
      nextNamespace = paramNs
    } else if (node.body) {
      const hookNs = getNamespaceFromHook(node.body)
      if (hookNs) {
        nextNamespace = hookNs
      }
    }
  }

  // 2. Extract from t() calls
  if (ts.isCallExpression(node)) {
    processTranslationCall(node, sourceFile, filePath, keys, scope, nextNamespace)
  }

  // 3. Extract from <Trans> components
  if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
    processTransComponent(node, sourceFile, filePath, keys, nextNamespace)
  }

  // Recursion
  ts.forEachChild(node, (child) => visitNode(child, sourceFile, filePath, keys, scope, nextNamespace))
}

/**
 * Scans all configured source files for translation keys.
 * Returns a map of found keys.
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

    // Start traversal with default namespace
    visitNode(sourceFile, sourceFile, fullPath, keys, fileScope, CONFIG.defaultNamespace)
  }

  return keys
}

// ============================================================================
// PART 4: JSON MANIPULATION & MAIN ENTRY
// ============================================================================

/**
 * Helper to set value at a dotted path: "section.title" -> { section: { title: "..." } }
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
 * Helper to get value at a dotted path.
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
 * The main execution function.
 * 1. Scans code for keys.
 * 2. Compares with previous hashes to detect changes.
 * 3. Updates JSON files for all languages.
 */
export async function extract() {
  const keys = await scanAllFiles()
  const oldHashes = await loadHashes()
  const newHashes: Record<string, HashEntry> = {}

  const added: string[] = []
  const changed: string[] = []
  const namespaces = new Set<string>()

  // Detect changes via Hash
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

  // Update Files
  for (const lang of CONFIG.languages) {
    // Ensure namespaces exist
    for (const ns of namespaces) {
      await ensureNamespaceFile(lang, ns)
    }

    // Update index.ts
    const existingNamespaces = await getNamespaces(lang)
    const allNamespaces = [...new Set([...existingNamespaces, ...namespaces])]
    await updateIndexFile(lang, allNamespaces)

    // Process each namespace
    for (const namespace of namespaces) {
      const filePath = `${CONFIG.messagesDir}/${lang}/${namespace}.json`
      const json = await loadJsonFile(filePath)
      let fileModified = false

      for (const [fullKey, extracted] of keys) {
        if (extracted.namespace !== namespace) continue

        const isChanged = changed.includes(fullKey)
        const existingValue = getNestedValue(json, extracted.keyPath)
        const isMissing = existingValue === undefined

        if (lang === CONFIG.defaultLanguage) {
          if (isChanged || isMissing) {
            setNestedValue(json, extracted.keyPath, extracted.defaultValue)
            fileModified = true
          }
        } else {
          let newContent: TranslationValue

          if (CONFIG.behavior.fillEmptyWithSource) {
            newContent = extracted.defaultValue
          } else {
            newContent = generateSkeleton(extracted.defaultValue)
          }

          // Merge işlemi: Var olan çevirileri koru, yeni gelenleri yukarıdaki karara göre ekle.
          const mergedValue = mergeDeep(existingValue as TranslationValue, newContent)

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

  // Save new hashes
  await saveHashes(newHashes)

  // Report
  if (added.length > 0) console.log(`  + ${added.length} keys added`)
  if (changed.length > 0) console.log(`  ~ ${changed.length} keys changed`)
  if (added.length === 0 && changed.length === 0) console.log(`  (No changes detected)`)

  return { keys }
}
