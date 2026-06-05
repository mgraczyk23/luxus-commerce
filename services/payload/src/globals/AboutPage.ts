import type { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  admin: {
    description: 'Manages all text and images on the About page. Fields are listed in page order — Hero, Excellence, Our Story, Philosophy, Mission, Curation, FFL Compliance.',
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
        await fetch(`${storefrontUrl}/api/revalidate?tag=about-page&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [

    /* ── Images ──────────────────────────────────────────────────────────── */
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero Image',
      admin: { description: 'Portrait orientation — shown right of the hero text. Best at 4:5 ratio, minimum 800 × 1000 px.' },
    },
    {
      name: 'storyImageMain',
      type: 'upload',
      relationTo: 'media',
      label: 'Story — Main Image (tall)',
      admin: { description: 'Tall image on the left of the Our Story section. Shown at 320 px height.' },
    },
    {
      name: 'storyImageLeft',
      type: 'upload',
      relationTo: 'media',
      label: 'Story — Bottom Left',
      admin: { description: 'Small image, bottom-left of story stack. Shown at 180 px height.' },
    },
    {
      name: 'storyImageRight',
      type: 'upload',
      relationTo: 'media',
      label: 'Story — Bottom Right',
      admin: { description: 'Small image, bottom-right of story stack. Shown at 180 px height.' },
    },
    {
      name: 'valuesImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Curation Section Image',
      admin: { description: 'Square image beside the curation criteria list. Best at 1:1 ratio, minimum 500 × 500 px.' },
    },

    /* ── Heritage Gallery ───────────────────────────────────────────────── */
    {
      name: 'galleryHeading',
      type: 'text',
      label: 'Gallery — Heading',
      admin: { description: 'Section title. Defaults to "From the Vault" if left blank.' },
    },
    {
      name: 'galleryIntro',
      type: 'text',
      label: 'Gallery — Intro',
      admin: { description: 'Optional one-line description shown below the heading.' },
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Gallery Items',
      admin: {
        description: 'Showcase past pieces that never made it to the live site. Each item is a photo with optional title and caption. Upload at 4:3 (landscape) for best results.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Photo',
        },
        {
          name: 'title',
          type: 'text',
          label: 'Title (optional)',
          admin: { description: 'e.g. "Colt Single Action Army — Factory Engraved"' },
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption (optional)',
          admin: { description: 'Short description shown on hover or below the photo.' },
        },
      ],
    },

    /* ── Hero ────────────────────────────────────────────────────────────── */
    {
      name: 'heroHeadline',
      type: 'text',
      label: 'Hero — Headline',
      admin: { description: 'The large heading in the hero.' },
    },
    {
      name: 'heroDescription',
      type: 'textarea',
      label: 'Hero — Description',
      admin: { description: 'Paragraph below the headline. Keep under ~200 characters.' },
    },
    { name: 'stat1Number', type: 'text', label: 'Hero Stat 1 — Number' },
    { name: 'stat1Label',  type: 'text', label: 'Hero Stat 1 — Label' },
    { name: 'stat2Number', type: 'text', label: 'Hero Stat 2 — Number' },
    { name: 'stat2Label',  type: 'text', label: 'Hero Stat 2 — Label' },
    { name: 'stat3Number', type: 'text', label: 'Hero Stat 3 — Number' },
    { name: 'stat3Label',  type: 'text', label: 'Hero Stat 3 — Label' },
    {
      name: 'fflLicenseNumber',
      type: 'text',
      label: 'FFL License Number',
      admin: { description: 'Your Federal Firearms License number — shown in the hero badge and FFL compliance section.' },
    },

    /* ── Investment-Grade Excellence ─────────────────────────────────────── */
    { name: 'excellenceHeading', type: 'text',     label: 'Excellence — Heading' },
    { name: 'excellenceBody',    type: 'textarea',  label: 'Excellence — Main Paragraph' },
    {
      name: 'excellenceItalic',
      type: 'textarea',
      label: 'Excellence — Italic Subtext',
      admin: { description: 'Displayed in italic below the main paragraph.' },
    },

    /* ── Our Story ───────────────────────────────────────────────────────── */
    { name: 'storyHeading',   type: 'text',    label: 'Our Story — Section Heading' },
    { name: 'storyPara1',     type: 'textarea', label: 'Our Story — Paragraph 1' },
    { name: 'storyPara2',     type: 'textarea', label: 'Our Story — Paragraph 2' },
    { name: 'storyPara3',     type: 'textarea', label: 'Our Story — Paragraph 3' },
    { name: 'storyPara4',     type: 'textarea', label: 'Our Story — Paragraph 4' },
    {
      name: 'storyPullquote',
      type: 'text',
      label: 'Our Story — Pull Quote',
      admin: { description: 'Displayed in the styled pull-quote block between the paragraphs.' },
    },
    { name: 'storyParaFinal', type: 'textarea', label: 'Our Story — Final Paragraph' },

    /* ── Philosophy ──────────────────────────────────────────────────────── */
    { name: 'phil1Title', type: 'text',     label: 'Philosophy Card 1 — Title' },
    { name: 'phil1Body',  type: 'textarea', label: 'Philosophy Card 1 — Body' },
    { name: 'phil2Title', type: 'text',     label: 'Philosophy Card 2 — Title' },
    { name: 'phil2Body',  type: 'textarea', label: 'Philosophy Card 2 — Body' },
    { name: 'phil3Title', type: 'text',     label: 'Philosophy Card 3 — Title' },
    { name: 'phil3Body',  type: 'textarea', label: 'Philosophy Card 3 — Body' },

    /* ── Mission ─────────────────────────────────────────────────────────── */
    { name: 'missionHeading', type: 'text',     label: 'Mission — Heading' },
    { name: 'missionBody1',   type: 'textarea', label: 'Mission — Paragraph 1' },
    { name: 'missionBody2',   type: 'textarea', label: 'Mission — Paragraph 2' },
    {
      name: 'missionCallout',
      type: 'text',
      label: 'Mission — Callout Quote',
      admin: { description: 'Short italic quote in the gold-bordered callout box.' },
    },
    { name: 'pillar1Title', type: 'text',     label: 'Pillar 1 — Title' },
    { name: 'pillar1Body',  type: 'textarea', label: 'Pillar 1 — Body' },
    { name: 'pillar2Title', type: 'text',     label: 'Pillar 2 — Title' },
    { name: 'pillar2Body',  type: 'textarea', label: 'Pillar 2 — Body' },
    { name: 'pillar3Title', type: 'text',     label: 'Pillar 3 — Title' },
    { name: 'pillar3Body',  type: 'textarea', label: 'Pillar 3 — Body' },
    { name: 'pillar4Title', type: 'text',     label: 'Pillar 4 — Title' },
    { name: 'pillar4Body',  type: 'textarea', label: 'Pillar 4 — Body' },

    /* ── Curation Standard ───────────────────────────────────────────────── */
    { name: 'curationHeading', type: 'text',     label: 'Curation — Section Heading' },
    { name: 'curationIntro',   type: 'textarea', label: 'Curation — Intro Paragraph' },
    { name: 'crit1Title',      type: 'text',     label: 'Criterion 1 — Title' },
    { name: 'crit1Body',       type: 'text',     label: 'Criterion 1 — Body' },
    { name: 'crit2Title',      type: 'text',     label: 'Criterion 2 — Title' },
    { name: 'crit2Body',       type: 'text',     label: 'Criterion 2 — Body' },
    { name: 'crit3Title',      type: 'text',     label: 'Criterion 3 — Title' },
    { name: 'crit3Body',       type: 'text',     label: 'Criterion 3 — Body' },
    { name: 'crit4Title',      type: 'text',     label: 'Criterion 4 — Title' },
    { name: 'crit4Body',       type: 'text',     label: 'Criterion 4 — Body' },

    /* ── FFL Compliance ──────────────────────────────────────────────────── */
    { name: 'fflBody', type: 'textarea', label: 'FFL — Main Body Paragraph' },
    {
      name: 'fflCard1Body',
      type: 'text',
      label: 'FFL — Card 1 Body (Federal License)',
      admin: { description: 'Use {LICENSE} as a placeholder for the FFL license number.' },
    },
    { name: 'fflCard2Body', type: 'text', label: 'FFL — Card 2 Body (State Law)' },
  ],
}
