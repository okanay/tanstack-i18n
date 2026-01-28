import { createFileRoute } from '@tanstack/react-router'

interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const BASE_URL = process.env.VITE_CANONICAL_URL || 'http://localhost:3000'
        const today = new Date().toISOString().split('T')[0]

        const sitemapEntries: SitemapEntry[] = [
          { loc: `${BASE_URL}/`, lastmod: today, changefreq: 'daily', priority: 1.0 },
          { loc: `${BASE_URL}/tr`, lastmod: today, changefreq: 'daily', priority: 1.0 },
          { loc: `${BASE_URL}/fr`, lastmod: today, changefreq: 'daily', priority: 1.0 },

          { loc: `${BASE_URL}/about`, lastmod: today, changefreq: 'monthly', priority: 0.8 },
          { loc: `${BASE_URL}/hakkimizda`, lastmod: today, changefreq: 'monthly', priority: 0.8 },
          { loc: `${BASE_URL}/environ`, lastmod: today, changefreq: 'monthly', priority: 0.8 },

          { loc: `${BASE_URL}/contact`, lastmod: today, changefreq: 'monthly', priority: 0.7 },
          { loc: `${BASE_URL}/iletisim`, lastmod: today, changefreq: 'monthly', priority: 0.7 },
          { loc: `${BASE_URL}/nous-contacter`, lastmod: today, changefreq: 'monthly', priority: 0.7 },

          { loc: `${BASE_URL}/products`, lastmod: today, changefreq: 'daily', priority: 0.9 },
          { loc: `${BASE_URL}/urunler`, lastmod: today, changefreq: 'daily', priority: 0.9 },
          { loc: `${BASE_URL}/produits`, lastmod: today, changefreq: 'daily', priority: 0.9 },

          { loc: `${BASE_URL}/products/search`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
          { loc: `${BASE_URL}/urunler/arama`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
          { loc: `${BASE_URL}/produits/recherche`, lastmod: today, changefreq: 'weekly', priority: 0.6 },
        ]

        const xml = generateSitemapXml(sitemapEntries)

        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
          },
        })
      },
    },
  },
})

function generateSitemapXml(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const entry of entries) {
    xml += '  <url>\n'
    xml += `    <loc>${entry.loc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</loc>\n`

    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`
    }

    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`
    }

    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`
    }

    xml += '  </url>\n'
  }

  xml += '</urlset>'
  return xml
}
