import type { GlobalConfig } from 'payload'

export const FeaturedPage: GlobalConfig = {
  slug: 'featured-page',
  admin: {
    description: 'Text content for the Featured page. Product selection is managed via the Medusa "featured" collection or category.',
  },
  access: { read: () => true },
  hooks: {
    afterChange: [
      async () => {
        const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
        const secret = process.env.REVALIDATE_SECRET ?? ''
        if (!secret) return
        await fetch(`${storefrontUrl}/api/revalidate?tag=featured-page&secret=${encodeURIComponent(secret)}`).catch(() => {})
      },
    ],
  },
  fields: [
    { name: 'headline',        type: 'text',     label: 'Page Headline' },
    { name: 'introParagraph',  type: 'textarea', label: 'Intro Paragraph' },
    { name: 'classifiedsHeadline', type: 'text',     label: 'Classifieds Section — Headline' },
    { name: 'classifiedsIntro',    type: 'textarea', label: 'Classifieds Section — Intro' },
    { name: 'classifiedsBadge',    type: 'text',     label: 'Classifieds Badge Label', admin: { description: 'Small pill shown on classifieds section, e.g. "Coming Soon" or "Preview".' } },
  ],
}
