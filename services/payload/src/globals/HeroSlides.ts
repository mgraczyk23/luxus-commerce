import type { GlobalConfig } from 'payload'

export const HeroSlides: GlobalConfig = {
  slug: 'hero-slides',
  admin: {
    description: 'Home page hero carousel — slides, headings, body text, and the featured image slider.',
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
      name: 'wordmark',
      type: 'text',
      label: 'Brand Name / Wordmark',
      defaultValue: 'Luxus Collection',
      admin: { description: 'Main H1 heading displayed below the carousel.' },
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
      defaultValue: 'The Forefront of Exclusive Firearms',
      admin: { description: 'Displayed below the wordmark in gold.' },
    },
    {
      name: 'introBody',
      type: 'textarea',
      label: 'Intro Body Text',
      admin: {
        description: 'Body copy shown in the left column below the slider. Separate paragraphs with a blank line.',
        placeholder: 'Luxus Collection is a privately curated portfolio…',
      },
    },
    {
      name: 'featuredImages',
      type: 'array',
      label: 'Featured Images — Right Column Slider',
      maxRows: 8,
      admin: {
        description: 'Images that cycle in the right column below the main slider. Upload landscape or square photos.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Image',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption (optional)',
        },
      ],
    },
    {
      name: 'slides',
      type: 'array',
      label: 'Main Carousel Slides',
      maxRows: 6,
      admin: {
        description: 'Full-width background slides. Enable/disable without deleting. Kicker and caption overlay the image at the bottom.',
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
          label: 'Kicker (small label above caption)',
          admin: { placeholder: 'e.g. The Vault' },
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption',
          admin: { placeholder: 'e.g. 1911 Collection · Top-down array' },
        },
      ],
    },
  ],
}
