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
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const justPublished =
          doc.status === 'published' &&
          (operation === 'create' || previousDoc?.status !== 'published')
        if (!justPublished) return

        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) return

        const siteUrl = (process.env.PAYLOAD_PUBLIC_SERVER_URL ?? 'https://api.luxus-collection.com/cms').replace('/cms', '')
        const articleUrl = `${siteUrl}/article/${doc.slug}`

        // Fetch all active subscribers
        const result = await req.payload.find({
          collection: 'subscribers',
          where: { status: { equals: 'active' } },
          limit: 1000,
          pagination: false,
        })

        if (result.docs.length === 0) return

        const heroImg = typeof doc.featuredImage === 'object' && doc.featuredImage?.url
          ? `<img src="${siteUrl}/cms${doc.featuredImage.url}" alt="${doc.featuredImage.alt ?? ''}" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto 24px"/>`
          : ''

        for (const sub of result.docs) {
          const unsubUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(sub.email)}`
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Luxus Collection <noreply@luxus-collection.com>',
              to: sub.email,
              subject: `New Article: ${doc.title}`,
              html: `
                <div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;color:#1a1a1a">
                  <div style="border-bottom:1px solid #e8e4df;padding:28px 0 20px;text-align:center;margin-bottom:32px">
                    <span style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c9a96e;font-family:'Arial',sans-serif">Luxus Collection</span>
                  </div>
                  <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;font-family:'Arial',sans-serif;margin-bottom:12px">${doc.category ?? 'Editorial'}</p>
                  <h1 style="font-size:28px;font-weight:400;line-height:1.2;margin:0 0 16px">${doc.title}</h1>
                  <p style="font-size:15px;font-style:italic;color:#6b6560;line-height:1.7;margin-bottom:28px">${doc.excerpt ?? ''}</p>
                  ${heroImg}
                  <a href="${articleUrl}" style="display:inline-block;background:#c9a96e;color:#fff;padding:13px 32px;text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-family:'Arial',sans-serif;font-weight:600">
                    Read Article
                  </a>
                  <div style="border-top:1px solid #e8e4df;margin-top:40px;padding-top:20px;font-size:10px;color:#9e9994;font-family:'Arial',sans-serif;line-height:1.8">
                    You're receiving this because you subscribed to the Luxus Collection newsletter.<br>
                    <a href="${unsubUrl}" style="color:#c9a96e">Unsubscribe</a>
                  </div>
                </div>
              `,
            }),
          }).catch(() => {/* non-fatal per subscriber */})
        }
      },
    ],
  },
}
