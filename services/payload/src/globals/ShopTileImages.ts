import type { GlobalConfig } from 'payload'

export const ShopTileImages: GlobalConfig = {
  slug: 'shop-tile-images',
  admin: {
    description: [
      'Images for the Collections and Categories browse tiles on the home page.',
      '',
      'HOW IT WORKS',
      '━━━━━━━━━━━━',
      'Each tile on the home page is a collection or category from your Medusa store.',
      'This page lets you assign a photo to each one.',
      '',
      'TO ADD AN IMAGE TO A TILE:',
      '  1. Find the handle for that collection or category.',
      '     → Go to the storefront and click the tile — the URL will show the handle.',
      '        Example: /collection/1911-series  →  handle is  1911-series',
      '        Example: /category/engraved       →  handle is  engraved',
      '  2. Add a row below under Collections or Categories.',
      '  3. Paste the handle exactly as it appears in the URL.',
      '  4. Upload your photo (landscape, 800 × 500 px minimum).',
      '  5. Save — the tile updates on the site within 5 minutes.',
      '',
      'TIPS',
      '  • If a tile has no image here it shows a grey placeholder — that is fine.',
      '  • Handles are case-sensitive and must match exactly (use lowercase with hyphens).',
      '  • You can add rows for tiles that don\'t exist yet — they\'ll activate automatically',
      '    when that collection or category is created in Medusa.',
    ].join('\n'),
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
        await fetch(`${storefrontUrl}/api/revalidate?tag=shop-tile-images&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [
    {
      type: 'ui',
      name: 'collectionInstructions',
      admin: {
        components: {},
        condition: () => false,
      },
    },
    {
      name: 'collections',
      type: 'array',
      label: 'Collection Tile Images',
      admin: {
        description: 'One row per collection. The handle must match exactly what appears in the URL after /collection/ on the storefront.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'handle',
          type: 'text',
          label: 'Collection Handle',
          required: true,
          admin: {
            description: 'Copy from the storefront URL: /collection/[handle] — e.g. "1911-series" or "heritage-revolvers"',
            placeholder: 'e.g. 1911-series',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Tile Image',
          required: true,
          admin: {
            description: 'Landscape photo works best. Minimum 800 × 500 px. Shown at 130 px height, full-width.',
          },
        },
      ],
    },
    {
      name: 'categories',
      type: 'array',
      label: 'Category Tile Images',
      admin: {
        description: 'One row per category. The handle must match exactly what appears in the URL after /category/ on the storefront.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'handle',
          type: 'text',
          label: 'Category Handle',
          required: true,
          admin: {
            description: 'Copy from the storefront URL: /category/[handle] — e.g. "engraved" or "limited-edition"',
            placeholder: 'e.g. engraved',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Tile Image',
          required: true,
          admin: {
            description: 'Landscape photo works best. Minimum 800 × 500 px. Shown at 130 px height, full-width.',
          },
        },
      ],
    },
    {
      name: 'models',
      type: 'array',
      label: 'Model Tile Images',
      admin: {
        description: 'One row per model. The handle is the model name converted to a URL slug — lowercase, spaces become hyphens. e.g. "Python" → "python", "P210 Legend" → "p210-legend". Check the storefront URL at /shop/model/[handle] to confirm.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'handle',
          type: 'text',
          label: 'Model Handle (slug)',
          required: true,
          admin: {
            description: 'Lowercase, hyphens only. e.g. "python", "p210-legend", "1911", "agent"',
            placeholder: 'e.g. python',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Tile Image',
          required: true,
          admin: {
            description: 'Landscape or square photo. Minimum 800 × 500 px.',
          },
        },
      ],
    },
  ],
}
