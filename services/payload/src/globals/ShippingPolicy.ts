import type { GlobalConfig } from 'payload'

const revalidate = async (tag: string) => {
  const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
  const secret = process.env.REVALIDATE_SECRET ?? ''
  if (!secret) return
  await fetch(`${storefrontUrl}/api/revalidate?tag=${tag}&secret=${encodeURIComponent(secret)}`).catch(() => {})
}

export const ShippingPolicy: GlobalConfig = {
  slug: 'shipping-policy',
  label: 'Shipping & Returns Policy',
  admin: {
    description: 'Edit the content of the Shipping & Returns policy page. Changes publish instantly.',
    group: 'Policy Pages',
  },
  access: { read: () => true },
  hooks: {
    afterChange: [async () => { await revalidate('policy-shipping') }],
  },
  fields: [
    {
      name: 'lastUpdated',
      type: 'text',
      label: 'Last Updated Date',
      defaultValue: 'May 1, 2026',
      admin: {
        description: 'Displayed on the page. Example: "June 1, 2026"',
      },
    },
    {
      name: 'sections',
      type: 'array',
      label: 'Policy Sections',
      admin: {
        description: 'Each section has a heading and body paragraph. Drag to reorder.',
      },
      minRows: 1,
      fields: [
        {
          name: 'heading',
          type: 'text',
          label: 'Section Heading',
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          label: 'Content',
          required: true,
          admin: {
            description: 'Plain text. Leave a blank line between paragraphs if needed.',
            rows: 5,
          },
        },
      ],
    },
  ],
}
