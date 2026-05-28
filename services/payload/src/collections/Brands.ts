import type { CollectionConfig } from 'payload'

const revalidate = async (tag: string) => {
  const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
  const secret = process.env.REVALIDATE_SECRET ?? ''
  if (!secret) return
  await fetch(`${storefrontUrl}/api/revalidate?tag=${tag}&secret=${encodeURIComponent(secret)}`).catch(() => {})
}

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    description: 'Manufacturer profiles — full editorial hub pages for each brand we carry. Build out each brand incrementally over time.',
    defaultColumns: ['name', 'slug', 'featured', 'updatedAt'],
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        await revalidate('brands')
        if (doc?.slug) await revalidate(`brand-${doc.slug}`)
      },
    ],
  },
  fields: [
    // ─── Core Identity ───────────────────────────────────────────────────────
    {
      name: 'name',
      type: 'text',
      label: 'Brand Name',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      unique: true,
      admin: {
        description: 'Must match the brand slug used in Medusa product attributes (e.g. "nighthawk-custom"). Used to link to /brand/[slug].',
      },
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
      admin: {
        description: 'Short phrase shown under the brand name on the hub page. 5–15 words.',
        placeholder: 'e.g. "Handcrafted American 1911s built to a higher standard."',
      },
    },
    {
      name: 'origin',
      type: 'text',
      label: 'Location / Origin',
      admin: { placeholder: 'e.g. Claremore, Oklahoma, USA' },
    },
    {
      name: 'foundingYear',
      type: 'number',
      label: 'Year Founded',
      admin: { placeholder: 'e.g. 1992' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Short Description',
      admin: {
        description: 'Brief summary shown on brand listing cards and About page tile. 2–4 sentences.',
        placeholder: 'e.g. "Founded in 1995 by a group of competition shooters..."',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Brand Logo',
      admin: {
        description: 'SVG or PNG with transparent background. Used on listing cards and brand page header.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero Image',
      admin: {
        description: 'Full-width header image for the brand hub page. Recommended: 1920×640px or wider.',
      },
    },

    // ─── Sidebar settings ────────────────────────────────────────────────────
    {
      name: 'showInHub',
      type: 'checkbox',
      label: 'Show in Resources on Guns hub',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'When checked, this brand appears on the /resources-on-guns listing page. Check this once editorial content (history, model series, etc.) has been added.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Show on About page',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Featured brands appear in the About page brand grid.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in brand grids.',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO Title',
      admin: {
        position: 'sidebar',
        description: 'Page title for search engines. Defaults to "[Brand Name] Firearms | Luxus Collection".',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      label: 'SEO Description',
      admin: {
        position: 'sidebar',
        description: 'Meta description (150–160 characters). Defaults to tagline or short description.',
      },
    },

    // ─── Editorial Content ───────────────────────────────────────────────────
    {
      name: 'history',
      type: 'richText',
      label: 'Brand History & Philosophy',
      admin: {
        description: 'Main editorial body. Use headings, paragraphs, blockquotes, and embedded images. This is the core of the brand hub page — build it out incrementally.',
      },
    },

    // ─── Model Series ────────────────────────────────────────────────────────
    {
      name: 'modelSeries',
      type: 'array',
      label: 'Model Series / Product Lines',
      admin: {
        description: 'Add one entry per major model family or product line. Build incrementally — start with your flagship models.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Model / Series Name',
          required: true,
          admin: { placeholder: 'e.g. "1911 Commander"' },
        },
        {
          name: 'yearIntroduced',
          type: 'number',
          label: 'Year Introduced',
          admin: { placeholder: 'e.g. 1950' },
        },
        {
          name: 'description',
          type: 'richText',
          label: 'Description',
          admin: {
            description: 'History, key features, and what makes this model special.',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Representative Image',
        },
        {
          name: 'productHandle',
          type: 'text',
          label: 'Medusa Product Handle (optional)',
          admin: {
            description: 'To link directly to a specific product listing, enter its Medusa handle here.',
            placeholder: 'e.g. "nighthawk-president-9mm"',
          },
        },
      ],
    },

    // ─── Photo Gallery ───────────────────────────────────────────────────────
    {
      name: 'gallery',
      type: 'array',
      label: 'Photo Gallery',
      admin: {
        description: 'Additional images shown in a grid on the brand hub page. Factory photos, craftsmanship shots, etc.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Image',
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption (optional)',
        },
      ],
    },

    // ─── Brand Timeline ──────────────────────────────────────────────────────
    {
      name: 'timeline',
      type: 'array',
      label: 'Brand Timeline',
      admin: {
        description: 'Key milestones in the brand\'s history. Displayed as a vertical timeline on the hub page.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'year',
          type: 'text',
          label: 'Year',
          required: true,
          admin: { placeholder: 'e.g. 1992' },
        },
        {
          name: 'title',
          type: 'text',
          label: 'Milestone Title',
          required: true,
          admin: { placeholder: 'e.g. "Company Founded in Claremore, Oklahoma"' },
        },
        {
          name: 'body',
          type: 'textarea',
          label: 'Details',
          admin: {
            placeholder: 'Brief description of this milestone.',
            rows: 3,
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Image (optional)',
        },
      ],
    },
  ],
}
