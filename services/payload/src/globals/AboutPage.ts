import type { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  admin: {
    description: 'Images for the About page — upload photos to replace the placeholder boxes. Aspect ratio hints are shown on each field.',
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
        await fetch(`${storefrontUrl}/api/revalidate?tag=about-page&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero Image',
      admin: {
        description: 'Portrait orientation — shown right of the hero text. Best at 4:5 ratio, minimum 800 × 1000 px.',
      },
    },
    {
      name: 'storyImageMain',
      type: 'upload',
      relationTo: 'media',
      label: 'Story Section — Main Image (tall)',
      admin: {
        description: 'Tall image on the left of the Our Story section. Landscape or portrait both work, shown at 320 px height.',
      },
    },
    {
      name: 'storyImageLeft',
      type: 'upload',
      relationTo: 'media',
      label: 'Story Section — Bottom Left',
      admin: {
        description: 'Small square/landscape image, bottom-left of story stack. Shown at 180 px height.',
      },
    },
    {
      name: 'storyImageRight',
      type: 'upload',
      relationTo: 'media',
      label: 'Story Section — Bottom Right',
      admin: {
        description: 'Small square/landscape image, bottom-right of story stack. Shown at 180 px height.',
      },
    },
    {
      name: 'valuesImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Curation / Values Section Image',
      admin: {
        description: 'Square image shown beside the curation criteria list. Best at 1:1 ratio, minimum 500 × 500 px.',
      },
    },
  ],
}
