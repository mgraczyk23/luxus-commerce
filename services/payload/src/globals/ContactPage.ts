import type { GlobalConfig } from 'payload'

export const ContactPage: GlobalConfig = {
  slug: 'contact-page',
  admin: {
    description: 'Text content for the Contact page. Phone numbers, emails, address, and hours are managed under Site Settings.',
  },
  access: { read: () => true },
  hooks: {
    afterChange: [
      async () => {
        const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
        const secret = process.env.REVALIDATE_SECRET ?? ''
        if (!secret) return
        await fetch(`${storefrontUrl}/api/revalidate?tag=contact-page&secret=${encodeURIComponent(secret)}`).catch(() => {})
      },
    ],
  },
  fields: [

    /* ── Hero ────────────────────────────────────────────────────────────── */
    { name: 'headline',       type: 'text',     label: 'Hero Headline' },
    { name: 'introParagraph', type: 'textarea', label: 'Hero Intro Paragraph' },

    /* ── Contact form topics ─────────────────────────────────────────────── */
    { name: 'topic1',  type: 'text', label: 'Form Topic 1' },
    { name: 'topic2',  type: 'text', label: 'Form Topic 2' },
    { name: 'topic3',  type: 'text', label: 'Form Topic 3' },
    { name: 'topic4',  type: 'text', label: 'Form Topic 4' },
    { name: 'topic5',  type: 'text', label: 'Form Topic 5' },
    { name: 'topic6',  type: 'text', label: 'Form Topic 6' },
    { name: 'topic7',  type: 'text', label: 'Form Topic 7' },
    { name: 'topic8',  type: 'text', label: 'Form Topic 8', admin: { description: 'Leave blank to hide.' } },
    { name: 'topic9',  type: 'text', label: 'Form Topic 9', admin: { description: 'Leave blank to hide.' } },
    { name: 'topic10', type: 'text', label: 'Form Topic 10', admin: { description: 'Leave blank to hide.' } },

    /* ── Channel card sub-texts ──────────────────────────────────────────── */
    { name: 'emailChannelSub', type: 'text',     label: 'Email Channel — Sub-text', admin: { description: 'Shown under the general email address card. E.g. "Response within 1 business day".' } },
    { name: 'salesChannelSub', type: 'textarea', label: 'Sales / Consignment Channel — Sub-text', admin: { description: 'Use newlines to create multiple lines.' } },
    { name: 'pressChannelSub', type: 'text',     label: 'Press & Media Channel — Sub-text' },

    /* ── "What To Expect" section ────────────────────────────────────────── */
    { name: 'expect1Title', type: 'text',     label: 'What To Expect — Card 1 Title' },
    { name: 'expect1Body',  type: 'textarea', label: 'What To Expect — Card 1 Body' },
    { name: 'expect2Title', type: 'text',     label: 'What To Expect — Card 2 Title' },
    { name: 'expect2Body',  type: 'textarea', label: 'What To Expect — Card 2 Body' },
    { name: 'expect3Title', type: 'text',     label: 'What To Expect — Card 3 Title' },
    { name: 'expect3Body',  type: 'textarea', label: 'What To Expect — Card 3 Body' },
    { name: 'expect4Title', type: 'text',     label: 'What To Expect — Card 4 Title' },
    { name: 'expect4Body',  type: 'textarea', label: 'What To Expect — Card 4 Body' },
  ],
}
