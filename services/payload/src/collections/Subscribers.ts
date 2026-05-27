import type { CollectionConfig } from 'payload'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'status', 'source', 'createdAt'],
    description: 'Newsletter subscribers — active subscribers are notified when a new article is published.',
  },
  access: {
    read:   ({ req }) => !!req.user,
    create: () => true,
    update: () => true,   // allows unsubscribe link to work without auth
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      label: 'Name (optional)',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      required: true,
      options: [
        { label: 'Active',        value: 'active' },
        { label: 'Unsubscribed',  value: 'unsubscribed' },
      ],
      admin: { position: 'sidebar' },
      access: { create: () => false },
    },
    {
      name: 'source',
      type: 'text',
      label: 'Sign-up source',
      admin: { position: 'sidebar', description: 'e.g. article slug or "homepage"' },
      access: { update: ({ req }) => !!req.user },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Prevent duplicate submissions gracefully
        if (operation === 'create') {
          try {
            const existing = await req.payload.find({
              collection: 'subscribers',
              where: { email: { equals: data.email } },
              limit: 1,
            })
            if (existing.docs.length > 0) {
              throw new Error('You are already subscribed.')
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.message === 'You are already subscribed.') throw err
          }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
