import type { GlobalConfig } from 'payload'

export const SupportPage: GlobalConfig = {
  slug: 'support-page',
  admin: {
    description: 'Text content for the Customer Support page. Phone, email, and hours are managed under Site Settings.',
  },
  access: { read: () => true },
  hooks: {
    afterChange: [
      async () => {
        const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://luxus-collection.com'
        const secret = process.env.REVALIDATE_SECRET ?? ''
        if (!secret) return
        await fetch(`${storefrontUrl}/api/revalidate?tag=support-page&secret=${encodeURIComponent(secret)}`).catch(() => {})
      },
    ],
  },
  fields: [

    /* ── Hero ────────────────────────────────────────────────────────────── */
    { name: 'headline',       type: 'text',     label: 'Hero Headline' },
    { name: 'introParagraph', type: 'textarea', label: 'Hero Intro Paragraph' },

    /* ── Support form topics ─────────────────────────────────────────────── */
    { name: 'topic1',  type: 'text', label: 'Form Topic 1' },
    { name: 'topic2',  type: 'text', label: 'Form Topic 2' },
    { name: 'topic3',  type: 'text', label: 'Form Topic 3' },
    { name: 'topic4',  type: 'text', label: 'Form Topic 4' },
    { name: 'topic5',  type: 'text', label: 'Form Topic 5' },
    { name: 'topic6',  type: 'text', label: 'Form Topic 6' },
    { name: 'topic7',  type: 'text', label: 'Form Topic 7' },
    { name: 'topic8',  type: 'text', label: 'Form Topic 8' },
    { name: 'topic9',  type: 'text', label: 'Form Topic 9', admin: { description: 'Leave blank to hide.' } },
    { name: 'topic10', type: 'text', label: 'Form Topic 10', admin: { description: 'Leave blank to hide.' } },

    /* ── Contact cards ───────────────────────────────────────────────────── */
    { name: 'emailCardSub', type: 'text', label: 'Email Support Card — Sub-text', admin: { description: 'Shown under the email support card. E.g. "Response within 1 business day".' } },

    /* ── FFL Transfer section ────────────────────────────────────────────── */
    { name: 'fflHeadline', type: 'text',     label: 'FFL Section — Headline' },
    { name: 'fflIntro',    type: 'textarea', label: 'FFL Section — Intro Paragraph' },
    { name: 'fflFeeNote',  type: 'textarea', label: 'FFL Section — Transfer Fee Note' },
    { name: 'fflStep1Title', type: 'text',     label: 'FFL Step 1 — Title' },
    { name: 'fflStep1Desc',  type: 'textarea', label: 'FFL Step 1 — Description' },
    { name: 'fflStep2Title', type: 'text',     label: 'FFL Step 2 — Title' },
    { name: 'fflStep2Desc',  type: 'textarea', label: 'FFL Step 2 — Description' },
    { name: 'fflStep3Title', type: 'text',     label: 'FFL Step 3 — Title' },
    { name: 'fflStep3Desc',  type: 'textarea', label: 'FFL Step 3 — Description' },
    { name: 'fflStep4Title', type: 'text',     label: 'FFL Step 4 — Title' },
    { name: 'fflStep4Desc',  type: 'textarea', label: 'FFL Step 4 — Description' },
    { name: 'fflStep5Title', type: 'text',     label: 'FFL Step 5 — Title' },
    { name: 'fflStep5Desc',  type: 'textarea', label: 'FFL Step 5 — Description' },

    /* ── Info cards (bottom) ─────────────────────────────────────────────── */
    { name: 'infoCard1Heading', type: 'text',     label: 'Info Card 1 — Heading (Legal Compliance)' },
    { name: 'infoCard1Body',    type: 'textarea', label: 'Info Card 1 — Body', admin: { description: 'Includes FFL license number — update when your license changes.' } },
    { name: 'infoCard2Heading', type: 'text',     label: 'Info Card 2 — Heading (Discreet Packaging)' },
    { name: 'infoCard2Body',    type: 'textarea', label: 'Info Card 2 — Body' },
    { name: 'infoCard3Heading', type: 'text',     label: 'Info Card 3 — Heading (Response Commitment)' },
    { name: 'infoCard3Body',    type: 'textarea', label: 'Info Card 3 — Body' },
  ],
}
