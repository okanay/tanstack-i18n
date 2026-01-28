export const DEFAULT_SEO = {
  title: 'My Site',
  description: 'Welcome to our website.',
  og: {
    title: 'My Site - Home',
    description: 'Welcome to our website',
  },
} as const

export const SEO = {
  en: {
    '/': {
      title: 'Home | My Site',
      description: 'Welcome to our website.',
      og: {
        title: 'My Site - Home',
        description: 'Welcome to our website',
      },
    },
    '/about': {
      title: 'About Us | My Site',
      description: 'Learn more about our company and team.',
      og: {
        title: 'About Us',
        description: 'Learn more about our company',
      },
    },
    '/contact': {
      title: 'Contact | My Site',
      description: 'Get in touch with us.',
      og: {
        title: 'Contact Us',
        description: 'Get in touch with us',
      },
    },
  },
  tr: {
    '/': {
      title: 'Ana Sayfa | Sitem',
      description: 'Web sitemize hoş geldiniz.',
      og: {
        title: 'Sitem - Ana Sayfa',
        description: 'Web sitemize hoş geldiniz',
      },
    },
    '/about': {
      title: 'Hakkımızda | Sitem',
      description: 'Şirketimiz ve ekibimiz hakkında bilgi edinin.',
      og: {
        title: 'Hakkımızda',
        description: 'Şirketimiz hakkında bilgi',
      },
    },
    '/contact': {
      title: 'İletişim | Sitem',
      description: 'Bizimle iletişime geçin.',
      og: {
        title: 'İletişim',
        description: 'Bizimle iletişime geçin',
      },
    },
  },
  fr: {
    '/': {
      title: 'Accueil | Mon Site',
      description: 'Bienvenue sur notre site.',
      og: {
        title: 'Mon Site - Accueil',
        description: 'Bienvenue sur notre site',
      },
    },
    '/about': {
      title: 'À Propos | Mon Site',
      description: 'En savoir plus sur notre entreprise.',
      og: {
        title: 'À Propos',
        description: 'En savoir plus sur notre entreprise',
      },
    },
    '/contact': {
      title: 'Contact | Mon Site',
      description: 'Contactez-nous.',
      og: {
        title: 'Contact',
        description: 'Contactez-nous',
      },
    },
  },
} as const
