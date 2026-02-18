export const loadLanguageResources = async (lang: LanguageValue) => {
  try {
    const resources = await import(`../messages/${lang}/index.ts`)
    return resources.default
  } catch (error) {
    console.error(`Language ${lang} not found, falling back to default resources.`)
    const resources = await import(`../messages/en/index.ts`)
    return resources.default
  }
}
