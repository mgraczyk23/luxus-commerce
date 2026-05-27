import type { GlobalConfig } from 'payload'

export const HeroSlides: GlobalConfig = {
  slug: 'hero-slides',
  admin: {
    description: 'Home page hero carousel — up to 6 slides. Upload a photo, set the kicker and caption, then enable each slide when ready.',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async () => {
        const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
        const secret = process.env.REVALIDATE_SECRET ?? ''
        if (!secret) return
        await fetch(`${storefrontUrl}/api/revalidate?tag=hero-slides&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [
    {
      name: 'slides',
      type: 'array',
      label: 'Slides',
      maxRows: 6,
      admin: {
        description: 'Slides are shown in order. Disable a slide to hide it without deleting it.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Show this slide',
          defaultValue: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Background Image',
          admin: {
            description: 'Landscape orientation works best — minimum 1440 × 700 px.',
          },
        },
        {
          name: 'kicker',
          type: 'text',
          label: 'Kicker (small label above heading)',
          admin: { placeholder: 'e.g. The Vault' },
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption (below kicker)',
          admin: { placeholder: 'e.g. 1911 Collection · Top-down array' },
        },
      ],
    },
  ],
}
