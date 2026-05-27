import type { CollectionConfig } from 'payload'

export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'authorName',
    defaultColumns: ['authorName', 'post', 'status', 'createdAt'],
    description: 'Reader comments — set status to Approved to publish, Rejected to discard.',
  },
  access: {
    // Public sees only approved; admins see everything
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'approved' } }
    },
    create: () => true,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: 'Pending review', value: 'pending' },
        { label: 'Approved',       value: 'approved' },
        { label: 'Rejected',       value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
      // Submitters can't set their own status
      access: { create: () => false },
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'authorEmail',
      type: 'email',
      required: true,
      label: 'Email',
      admin: { description: 'Not displayed publicly.' },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      label: 'Comment',
    },
    // Honeypot — bots fill this in, humans don't see it
    {
      name: 'honeypot',
      type: 'text',
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && data.honeypot) {
          throw new Error('Spam detected.')
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation !== 'create') return
        const apiKey = process.env.RESEND_API_KEY
        const adminEmail = process.env.ADMIN_EMAIL || 'info@luxus-collection.com'
        const siteUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL?.replace('/cms', '') || 'https://api.luxus-collection.com'
        if (!apiKey) return
        const postSlug = typeof doc.post === 'object' ? doc.post?.slug : doc.post
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Luxus Collection <noreply@luxus-collection.com>',
            to: adminEmail,
            subject: `New comment awaiting approval — "${doc.authorName}"`,
            html: `
              <p><strong>${doc.authorName}</strong> left a comment on <strong>${postSlug ?? doc.post}</strong>:</p>
              <blockquote style="border-left:3px solid #c9a96e;padding:12px 20px;background:#faf9f7;margin:16px 0">
                ${doc.body.replace(/\n/g, '<br>')}
              </blockquote>
              <p>
                <a href="${siteUrl}/cms/admin/collections/comments/${doc.id}" style="background:#c9a96e;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block;margin-top:8px">
                  Review in CMS
                </a>
              </p>
            `,
          }),
        }).catch(() => {/* non-fatal */})
      },
    ],
  },
  timestamps: true,
}
