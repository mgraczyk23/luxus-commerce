import type { CollectionConfig } from 'payload'
import { lexicalEditor, BlocksFeature } from '@payloadcms/richtext-lexical'

const revalidate = async (tag: string) => {
  const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
  const secret = process.env.REVALIDATE_SECRET ?? ''
  if (!secret) return
  await fetch(`${storefrontUrl}/api/revalidate?tag=${tag}&secret=${encodeURIComponent(secret)}`).catch(() => {})
}

// ─── Shared spec-row fields ────────────────────────────────────────────────
const specEntryFields = [
  {
    name: 'label',
    type: 'text' as const,
    label: 'Field',
    required: true,
    admin: { placeholder: 'e.g. "Caliber"' },
  },
  {
    name: 'value',
    type: 'text' as const,
    label: 'Value',
    required: true,
    admin: { placeholder: 'e.g. "9×19mm Parabellum"' },
  },
]

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
        description: 'Main body. Use headings, paragraphs, blockquotes, lists, and the Insert menu to add Spec Tables, Feature Boxes, or Two-Column sections anywhere in the flow.',
      },
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({
            blocks: [
              // ── Inline Spec Table ─────────────────────────────────────────
              {
                slug: 'specBlock',
                labels: {
                  singular: 'Spec Table',
                  plural:   'Spec Tables',
                },
                fields: [
                  {
                    name: 'heading',
                    type: 'text',
                    label: 'Table Heading',
                    admin: { placeholder: 'e.g. "P226 Standard — Specifications"' },
                  },
                  {
                    name: 'note',
                    type: 'textarea',
                    label: 'Note (optional)',
                    admin: {
                      rows: 2,
                      description: 'Short context paragraph shown above the rows.',
                    },
                  },
                  {
                    name: 'entries',
                    type: 'array',
                    label: 'Rows',
                    admin: { description: 'Add one row per spec. Use as many as needed.' },
                    fields: specEntryFields,
                  },
                ],
              },

              // ── Feature / Callout Box ─────────────────────────────────────
              {
                slug: 'featureBox',
                labels: {
                  singular: 'Feature / Callout Box',
                  plural:   'Feature / Callout Boxes',
                },
                fields: [
                  {
                    name: 'style',
                    type: 'select',
                    label: 'Box Style',
                    defaultValue: 'features',
                    options: [
                      { label: 'Feature List  (gold border, bullet points)', value: 'features' },
                      { label: 'Info / Note   (neutral, grey border)',        value: 'note'     },
                      { label: 'Callout       (dark background, gold text)',  value: 'callout'  },
                    ],
                  },
                  {
                    name: 'heading',
                    type: 'text',
                    label: 'Heading (optional)',
                    admin: { placeholder: 'e.g. "Key Features" or "Did You Know?"' },
                  },
                  {
                    name: 'items',
                    type: 'array',
                    label: 'Items',
                    admin: { description: 'Each item appears as one bullet point.' },
                    fields: [
                      {
                        name: 'text',
                        type: 'text',
                        label: 'Item',
                        required: true,
                        admin: { placeholder: 'e.g. "First firearm to use stainless steel slide"' },
                      },
                    ],
                  },
                ],
              },

              // ── Two-Column: Text + Spec Table ─────────────────────────────
              {
                slug: 'twoColumnSpec',
                labels: {
                  singular: 'Two Column (Text + Spec)',
                  plural:   'Two Column Sections',
                },
                fields: [
                  {
                    name: 'ratio',
                    type: 'select',
                    label: 'Column Ratio',
                    defaultValue: '50-50',
                    options: [
                      { label: '50 / 50  (equal columns)', value: '50-50'  },
                      { label: '60 Left / 40 Right',       value: '60-40'  },
                      { label: '40 Left / 60 Right',       value: '40-60'  },
                    ],
                  },
                  {
                    name: 'leftText',
                    type: 'textarea',
                    label: 'Left Column — Text',
                    admin: {
                      rows: 8,
                      description: 'Descriptive copy. Separate paragraphs with a blank line.',
                      placeholder: 'Write the context or narrative for this section here…',
                    },
                  },
                  {
                    name: 'rightHeading',
                    type: 'text',
                    label: 'Right Column — Table Heading',
                    admin: { placeholder: 'e.g. "Technical Specifications"' },
                  },
                  {
                    name: 'rightNote',
                    type: 'textarea',
                    label: 'Right Column — Note (optional)',
                    admin: { rows: 2, description: 'Short note shown above the spec rows on the right.' },
                  },
                  {
                    name: 'rightEntries',
                    type: 'array',
                    label: 'Right Column — Spec Rows',
                    fields: specEntryFields,
                  },
                ],
              },
            ],
          }),
        ],
      }),
    },

    // ─── Specification Tables (standalone, always at bottom) ──────────────────
    {
      name: 'specs',
      type: 'array',
      label: 'Specification Tables (Bottom)',
      admin: {
        description: 'These tables always render at the bottom of the page in a "Technical Data" section. Use the inline Spec Table block inside the content editor instead if you want tables positioned within the article.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'heading',
          type: 'text',
          label: 'Table Heading',
          admin: {
            description: 'Names this spec group.',
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
          fields: specEntryFields,
        },
      ],
    },
  ],
}
