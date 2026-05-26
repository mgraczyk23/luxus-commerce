import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  hooks: {
    beforeOperation: [
      ({ args, operation }) => {
        if ((operation === 'create' || operation === 'update') && args.data) {
          if (!args.data.alt && args.data.filename) {
            args.data.alt = String(args.data.filename).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
          }
        }
        return args
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: true,
}
