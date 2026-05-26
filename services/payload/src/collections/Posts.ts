import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
    description: 'Editorial articles and blog posts for the Luxus Collection website.',
  },
  access: {
    read: ({ req }) => {
      // Public can only read published posts; admins see all
      if (req.user) return true
      return { status: { equals: 'published' } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug, e.g. "cabot-guns-machining-process". Auto-filled from title.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.title) {
              return data.title
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft',     value: 'draft'     },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Leave blank to use the current date when publishing.',
        date: { pickerAppearance: 'dayAndTime' },
      },
      hooks: {
        beforeChange: [
          ({ value, data }) => {
            if (data?.status === 'published' && !value) {
              return new Date().toISOString()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Show in the featured slot on the home page.',
      },
    },
    {
      name: 'category',
      type: 'text',
      required: true,
      admin: {
        description: 'E.g. "Brand Spotlight", "Collector\'s Guide", "Craft & Engineering"',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Short summary shown on the listing page and in social shares. 1–2 sentences.',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Hero image for the article. Recommended: 1600×900px.',
      },
    },
    {
      name: 'author',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text', admin: { description: 'E.g. "Contributing Editor"' } },
        { name: 'bio',  type: 'textarea' },
      ],
    },
    {
      name: 'readTime',
      type: 'text',
      admin: {
        description: 'E.g. "9 min read". Leave blank to calculate automatically.',
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      type: 'array',
      admin: {
        description: 'Optional tags for filtering and cross-linking.',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'seoTitle',
      type: 'text',
      admin: {
        description: 'Override the page title for SEO. Defaults to article title.',
        position: 'sidebar',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      admin: {
        description: 'Override the meta description. Defaults to excerpt.',
        position: 'sidebar',
      },
    },
  ],
}
