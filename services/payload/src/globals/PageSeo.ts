import type { GlobalConfig } from 'payload'

function pageGroup(name: string, label: string) {
  return {
    name,
    type: 'group' as const,
    label,
    fields: [
      {
        name: 'title',
        type: 'text' as const,
        label: 'Meta Title',
        admin: { description: 'Shown in search results and browser tab. Leave blank to use the site default. Aim for 50–60 characters.' },
      },
      {
        name: 'description',
        type: 'textarea' as const,
        label: 'Meta Description',
        admin: { description: 'Shown in search engine results. Leave blank to use the site default. Aim for 120–160 characters.' },
      },
    ],
  }
}

export const PageSeo: GlobalConfig = {
  slug: 'page-seo',
  label: 'Page SEO',
  access: { read: () => true },
  admin: {
    description: 'Set the meta title and description for each storefront page. Leave fields blank to use built-in defaults. Changes publish instantly.',
    group: 'SEO',
  },
  hooks: {
    afterChange: [
      async () => {
        const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
        const secret = process.env.REVALIDATE_SECRET ?? ''
        if (!secret) return
        await fetch(`${storefrontUrl}/api/revalidate?tag=page-seo&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [
    pageGroup('home',        'Home Page  ( / )'),
    pageGroup('shop',        'Shop Page  ( /shop )'),
    pageGroup('about',       'About Page  ( /about )'),
    pageGroup('contact',     'Contact Page  ( /contact )'),
    pageGroup('support',     'Support Page  ( /support )'),
    pageGroup('faq',         'FAQ Page  ( /faq )'),
    pageGroup('consignment', 'Sell Your Gun  ( /sell-your-gun )'),
    pageGroup('articles',    'Articles Hub  ( /articles )'),
    pageGroup('brands',      'Browse Brands  ( /shop/brands )'),
    pageGroup('categories',  'Browse Categories  ( /shop/categories )'),
    pageGroup('collections', 'Browse Collections  ( /shop/collections )'),
  ],
}
