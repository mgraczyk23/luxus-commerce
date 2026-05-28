import type { CollectionConfig } from 'payload'

const revalidate = async (tag: string) => {
  const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
  const secret = process.env.REVALIDATE_SECRET ?? ''
  if (!secret) return
  await fetch(`${storefrontUrl}/api/revalidate?tag=${tag}&secret=${encodeURIComponent(secret)}`).catch(() => {})
}

export const ResourcePages: CollectionConfig = {
  slug: 'resource-pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', 'status', 'sortOrder', 'updatedAt'],
    description: 'Individual resource articles — one document per model, topic, or sub-page. Each appears at /resources-on-guns/[brand]/[slug]/. Create new documents here to add pages without any code changes.',
    group: 'Content',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'published' } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        const brand = doc.brand
        const brandSlug = typeof brand === 'object' ? brand?.slug : null
        if (brandSlug) {
          await revalidate(`resource-brand-${brandSlug}`)
        }
        if (doc?.slug) await revalidate(`resource-page-${doc.slug}`)
      },
    ],
  },
  fields: [
    // ─── Core ────────────────────────────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      label: 'Page Title',
      required: true,
      admin: { placeholder: 'e.g. "SIG P226 — Specifications & History"' },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      unique: true,
      admin: {
        description: 'Auto-generated from title. Becomes the last part of the URL: /resources-on-guns/[brand]/[slug]/',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.title) {
              return (data.title as string)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Excerpt',
      admin: {
        description: 'Short summary shown on the brand hub listing card. 1–2 sentences.',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Featured Image',
      admin: {
        description: 'Image shown on listing cards and as the article hero. Recommended: 1600×900px.',
      },
    },

    // ─── Sidebar ─────────────────────────────────────────────────────────────
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
      required: true,
      hasMany: false,
      admin: {
        position: 'sidebar',
        description: 'Which brand hub does this page belong to?',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft',     value: 'draft'     },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the brand hub listing. Use 10, 20, 30…',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO Title',
      admin: {
        position: 'sidebar',
        description: 'Overrides the page title for search engines.',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      label: 'SEO Description',
      admin: {
        position: 'sidebar',
        description: 'Overrides the meta description. Defaults to excerpt.',
      },
    },

    // ─── Main Content ─────────────────────────────────────────────────────────
    {
      name: 'content',
      type: 'richText',
      label: 'Article Content',
      admin: {
        description: 'Main body. Use headings, paragraphs, blockquotes, lists, and embedded images. Write as long or as detailed as needed.',
      },
    },

    // ─── Specification Tables ─────────────────────────────────────────────────
    {
      name: 'specs',
      type: 'array',
      label: 'Specification Tables',
      admin: {
        description: 'Add one entry per spec group (e.g. one per model variant). Each group shows as a labeled specification table on the page.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'heading',
          type: 'text',
          label: 'Table Heading',
          admin: {
            description: 'Names this spec group. E.g. "P226 Standard" or "P226 Navy Model Specifications".',
            placeholder: 'e.g. "Standard Model Specifications"',
          },
        },
        {
          name: 'note',
          type: 'textarea',
          label: 'Table Note (optional)',
          admin: {
            description: 'Optional context paragraph shown above the spec rows.',
            rows: 2,
          },
        },
        {
          name: 'entries',
          type: 'array',
          label: 'Specification Rows',
          admin: {
            description: 'Each row is one label/value pair. Add as many as needed.',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Field',
              required: true,
              admin: { placeholder: 'e.g. "Caliber"' },
            },
            {
              name: 'value',
              type: 'text',
              label: 'Value',
              required: true,
              admin: { placeholder: 'e.g. "9×19mm Parabellum"' },
            },
          ],
        },
      ],
    },
  ],
}
