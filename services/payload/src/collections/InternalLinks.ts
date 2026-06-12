import type { CollectionConfig } from 'payload'

const revalidate = async () => {
  const url = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://dev.luxus-collection.com'
  const secret = process.env.REVALIDATE_SECRET ?? ''
  await fetch(`${url}/api/revalidate?secret=${encodeURIComponent(secret)}&tag=internal-links`).catch(() => {})
}

export const InternalLinks: CollectionConfig = {
  slug: 'internal-links',
  admin: {
    useAsTitle: 'keyword',
    defaultColumns: ['keyword', 'url', 'priority', 'enabled'],
    description:
      'Keyword phrases automatically linked in article body text. ' +
      'The engine inserts at most one link per paragraph. ' +
      'Longer keywords take priority over shorter ones when both match the same paragraph.',
    group: 'SEO',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [async () => { await revalidate() }],
    afterDelete: [async () => { await revalidate() }],
  },
  fields: [
    {
      name: 'keyword',
      type: 'text',
      required: true,
      admin: {
        description:
          'The phrase to match in article text (case-insensitive). ' +
          'Example: "Sig Sauer P320" or "Wilson Combat"',
      },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        description:
          'Destination path or full URL. ' +
          'Examples: /product/sig-sauer-p320-x-carry  or  /brand/wilson-combat',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 10,
      admin: {
        description:
          'When two keywords could match the same paragraph, higher priority wins. ' +
          'Manual entries default to 10. Brands auto-rank at 50, categories at 40, products at 30.',
      },
    },
  ],
}
