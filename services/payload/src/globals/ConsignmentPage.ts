import type { GlobalConfig } from 'payload'

export const ConsignmentPage: GlobalConfig = {
  slug: 'consignment-page',
  admin: {
    description: 'Text content for the Consignment & Private Sales page. Contact info (phone, email, hours) is managed under Site Settings.',
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
        await fetch(`${storefrontUrl}/api/revalidate?tag=consignment-page&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [

    /* ── Hero banner ─────────────────────────────────────────────────────── */
    { name: 'headline',      type: 'text',     label: 'Page Headline' },
    { name: 'introParagraph', type: 'textarea', label: 'Intro Paragraph' },

    /* ── Consign vs Sell box ─────────────────────────────────────────────── */
    { name: 'diffBoxTitle',   type: 'text',     label: 'Difference Box — Title' },
    { name: 'option1Heading',  type: 'text',     label: 'Option 1 — Heading (Consignment)' },
    { name: 'option1Body',     type: 'textarea', label: 'Option 1 — Body' },
    { name: 'option1Link',     type: 'text',     label: 'Option 1 — Link URL (optional)', admin: { description: 'Shown as a text link below the body. Requires Link Text to be set.' } },
    { name: 'option1LinkText', type: 'text',     label: 'Option 1 — Link Text (optional)', admin: { description: 'The clickable label for the link, e.g. "Browse Classifieds" or "Learn More".' } },
    { name: 'option2Heading',  type: 'text',     label: 'Option 2 — Heading (Private Sale)' },
    { name: 'option2Body',     type: 'textarea', label: 'Option 2 — Body' },
    { name: 'option2Link',     type: 'text',     label: 'Option 2 — Link URL (optional)' },
    { name: 'option2LinkText', type: 'text',     label: 'Option 2 — Link Text (optional)' },
    { name: 'option3Heading',  type: 'text',     label: 'Option 3 — Heading', admin: { description: 'Leave blank to hide this option.' } },
    { name: 'option3Body',     type: 'textarea', label: 'Option 3 — Body' },
    { name: 'option3Link',     type: 'text',     label: 'Option 3 — Link URL (optional)' },
    { name: 'option3LinkText', type: 'text',     label: 'Option 3 — Link Text (optional)' },
    { name: 'option4Heading',  type: 'text',     label: 'Option 4 — Heading', admin: { description: 'Leave blank to hide this option.' } },
    { name: 'option4Body',     type: 'textarea', label: 'Option 4 — Body' },
    { name: 'option4Link',     type: 'text',     label: 'Option 4 — Link URL (optional)' },
    { name: 'option4LinkText', type: 'text',     label: 'Option 4 — Link Text (optional)' },
    { name: 'option5Heading',  type: 'text',     label: 'Option 5 — Heading', admin: { description: 'Leave blank to hide this option.' } },
    { name: 'option5Body',     type: 'textarea', label: 'Option 5 — Body' },
    { name: 'option5Link',     type: 'text',     label: 'Option 5 — Link URL (optional)' },
    { name: 'option5LinkText', type: 'text',     label: 'Option 5 — Link Text (optional)' },

    /* ── Rates note ──────────────────────────────────────────────────────── */
    {
      name: 'commissionNote',
      type: 'textarea',
      label: 'Commission / Rates Note',
      admin: { description: 'Shown below the contact cards. Bold key numbers by wrapping them in ** (e.g. **15%**) — the page renders the first two ** pairs as bold.' },
    },
    {
      name: 'salesEmailResponseTime',
      type: 'text',
      label: 'Sales Email — Response Time Label',
      admin: { description: 'Small line under the sales email address. E.g. "Response within 3 business days".' },
    },

    /* ── Form ────────────────────────────────────────────────────────────── */
    { name: 'formHeading', type: 'text', label: 'Form — Section Heading' },

    /* ── What Happens Next sidebar ───────────────────────────────────────── */
    { name: 'step1Title', type: 'text',     label: 'Step 1 — Title' },
    { name: 'step1Body',  type: 'textarea', label: 'Step 1 — Body' },
    { name: 'step2Title', type: 'text',     label: 'Step 2 — Title' },
    { name: 'step2Body',  type: 'textarea', label: 'Step 2 — Body' },
    { name: 'step3Title', type: 'text',     label: 'Step 3 — Title' },
    { name: 'step3Body',  type: 'textarea', label: 'Step 3 — Body' },
    { name: 'step4Title', type: 'text',     label: 'Step 4 — Title' },
    { name: 'step4Body',  type: 'textarea', label: 'Step 4 — Body' },

    /* ── Outright sale sidebar note ──────────────────────────────────────── */
    { name: 'outrightBoxBody',     type: 'textarea', label: 'Prefer to Sell Outright? — Body' },
    { name: 'outrightBoxLink',     type: 'text',     label: 'Prefer to Sell Outright? — Link URL (optional)' },
    { name: 'outrightBoxLinkText', type: 'text',     label: 'Prefer to Sell Outright? — Link Text (optional)', admin: { description: 'e.g. "Browse Classifieds" or "View Listings"' } },
  ],
}
