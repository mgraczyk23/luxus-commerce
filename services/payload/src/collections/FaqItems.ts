import type { CollectionConfig } from 'payload'

const revalidate = async () => {
  const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
  const secret = process.env.REVALIDATE_SECRET ?? ''
  if (!secret) return
  await fetch(`${storefrontUrl}/api/revalidate?tag=faq&secret=${encodeURIComponent(secret)}`).catch(() => {})
}

export const FaqItems: CollectionConfig = {
  slug: 'faq-items',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', 'sortOrder', 'status'],
    description: 'FAQ questions and answers shown on the /faq page. Group questions by entering the same Category name. Items are sorted within each category by Sort Order.',
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
    afterChange: [async () => { await revalidate() }],
    afterDelete: [async () => { await revalidate() }],
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      label: 'Question',
      required: true,
      admin: { placeholder: 'e.g. "How do I find an FFL dealer near me?"' },
    },
    {
      name: 'answer',
      type: 'textarea',
      label: 'Answer',
      required: true,
      admin: {
        rows: 6,
        placeholder: 'Write the full answer here…',
      },
    },
    {
      name: 'category',
      type: 'text',
      label: 'Category',
      required: true,
      admin: {
        description: 'Groups questions together on the FAQ page. Use exact consistent spelling — e.g. "FFL Transfers & Shipping". New category names appear automatically.',
        placeholder: 'e.g. "Ordering & Purchasing"',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first. Use 10, 20, 30… to leave room for future items.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'published',
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Draft',     value: 'draft'     },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
