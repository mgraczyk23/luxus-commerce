import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    description: 'Global site settings — edit once, updates everywhere. Save to publish instantly.',
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
        await fetch(`${storefrontUrl}/api/revalidate?tag=site-settings&secret=${encodeURIComponent(secret)}`)
          .catch(() => {})
      },
    ],
  },
  fields: [
    {
      name: 'branding',
      type: 'group',
      label: 'Branding',
      admin: { description: 'Logo and favicon used across the site. Upload new files here to update them instantly — no code change needed.' },
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          label: 'Site Logo',
          admin: { description: 'Displayed in the header and footer. Recommended: WebP or SVG with transparent background, at least 336 × 84 px.' },
        },
        {
          name: 'favicon',
          type: 'upload',
          relationTo: 'media',
          label: 'Favicon / Browser Icon',
          admin: { description: 'Shown in browser tabs and bookmarks. Recommended: PNG or WebP, 64 × 64 px, square.' },
        },
        {
          name: 'legalName',
          type: 'text',
          label: 'Legal Business Name',
          admin: { description: 'Your registered legal entity name (e.g. "Luxus Collection LLC"). Used in Organization schema for SEO. Leave blank to use "Luxus Collection".' },
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: 'Contact Information',
      fields: [
        { name: 'phone',        type: 'text',  label: 'Main Phone',                defaultValue: '(941) 253-3660' },
        { name: 'phoneTollFree',type: 'text',  label: 'Toll-Free Phone',           defaultValue: '(833) 486-6659' },
        { name: 'emailInfo',    type: 'email', label: 'General Email (info@)',     defaultValue: 'info@luxus-collection.com' },
        { name: 'emailSupport', type: 'email', label: 'Support Email',             defaultValue: 'support@luxus-collection.com' },
        { name: 'emailSales',   type: 'email', label: 'Sales / Consignment Email', defaultValue: 'sales@luxus-collection.com' },
        { name: 'emailPress',   type: 'email', label: 'Press Email',               defaultValue: 'press@luxus-collection.com' },
      ],
    },
    {
      name: 'address',
      type: 'group',
      label: 'Address',
      fields: [
        { name: 'line1', type: 'text', label: 'Street Address', defaultValue: '1199 N Beneva Rd' },
        { name: 'city',  type: 'text', label: 'City',           defaultValue: 'Sarasota' },
        { name: 'state', type: 'text', label: 'State',          defaultValue: 'FL' },
        { name: 'zip',   type: 'text', label: 'ZIP Code',       defaultValue: '34232' },
        {
          name: 'mapEmbedUrl',
          type: 'text',
          label: 'Map Embed URL',
          admin: { description: 'From Google Maps: search your address → Share → Embed a map → copy the src="…" URL. Leave blank to auto-generate from the address fields above.' },
        },
      ],
    },
    {
      name: 'hours',
      type: 'group',
      label: 'Business Hours',
      fields: [
        { name: 'weekdayOpen',   type: 'text',     label: 'Mon – Fri Opens',  defaultValue: '8:30 AM'  },
        { name: 'weekdayClose',  type: 'text',     label: 'Mon – Fri Closes', defaultValue: '6:00 PM'  },
        { name: 'saturdayOpen',  type: 'text',     label: 'Saturday Opens',   defaultValue: '10:00 AM' },
        { name: 'saturdayClose', type: 'text',     label: 'Saturday Closes',  defaultValue: '2:00 PM'  },
        { name: 'timezone',      type: 'text',     label: 'Timezone Label',   defaultValue: 'EST'       },
        { name: 'sundayClosed',  type: 'checkbox', label: 'Closed on Sunday', defaultValue: true        },
      ],
    },
    {
      name: 'social',
      type: 'group',
      label: 'Social Media Links',
      admin: { description: 'Leave blank to hide from the site.' },
      fields: [
        { name: 'facebook',  type: 'text', label: 'Facebook URL'  },
        { name: 'instagram', type: 'text', label: 'Instagram URL' },
        { name: 'linkedin',  type: 'text', label: 'LinkedIn URL'  },
        { name: 'twitter',   type: 'text', label: 'X / Twitter URL' },
        { name: 'youtube',   type: 'text', label: 'YouTube URL'   },
        { name: 'pinterest', type: 'text', label: 'Pinterest URL' },
      ],
    },
    {
      name: 'banking',
      type: 'group',
      label: 'Wire Transfer / Banking',
      admin: { description: 'Shown on invoices and order confirmations. All fields are optional — leave blank to hide a row.' },
      fields: [
        { name: 'bankName',      type: 'text', label: 'Bank Name',           defaultValue: 'Truist Bank' },
        { name: 'accountName',   type: 'text', label: 'Account / Credit To', defaultValue: 'Luxus Capital, LLC' },
        { name: 'routingNumber', type: 'text', label: 'ABA Routing Number',  defaultValue: '263191387' },
        { name: 'accountNumber', type: 'text', label: 'Account Number',      defaultValue: '1100009085694' },
        { name: 'swiftCode',     type: 'text', label: 'SWIFT / BIC (international, optional)' },
        { name: 'location',      type: 'text', label: 'Bank Location',       defaultValue: 'Sarasota, FL' },
        { name: 'memo',          type: 'text', label: 'Payment Memo / Reference (optional)' },
      ],
    },
    {
      name: 'fflLicense',
      type: 'text',
      label: 'FFL License Number',
      admin: {
        description: 'Your Federal Firearms License number. Appears on the About page, Support page, and Footer. Update here whenever your license renews.',
        placeholder: '1-59-XXX-XX-XX-XXXXX',
      },
    },
    {
      name: 'productCards',
      type: 'group',
      label: 'Product Cards',
      admin: { description: 'Controls which badges appear on product cards across all shop and listing pages.' },
      fields: [
        {
          name: 'showCategoryBadge',
          type: 'checkbox',
          label: 'Show category badge',
          defaultValue: true,
          admin: { description: 'Displays the product category label in the top-left corner of each card (e.g. "Semi-Auto Pistol"). Only shown on in-stock items.' },
        },
        {
          name: 'showAvailabilityBadge',
          type: 'checkbox',
          label: 'Show availability badge',
          defaultValue: true,
          admin: { description: 'Displays "Available" or "Unavailable" in the top-right corner of each card.' },
        },
      ],
    },
    {
      name: 'announcement',
      type: 'group',
      label: 'Announcement Bar',
      admin: { description: 'Appears at the top of every page when enabled.' },
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Show announcement bar', defaultValue: false },
        { name: 'message', type: 'text',     label: 'Message text' },
        { name: 'link',    type: 'text',     label: 'Link URL (optional)' },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      label: 'Footer',
      fields: [
        {
          name: 'blurb',
          type: 'textarea',
          label: 'Brand Blurb',
          admin: { description: 'Short description shown under the logo in the footer.' },
          defaultValue: "A boutique destination for the serious collector, curating the world's finest production and custom pistols since 2026.",
        },
        {
          name: 'copyrightLine',
          type: 'text',
          label: 'Copyright Line',
          admin: { description: 'Shown on the left of the bottom bar. E.g. "© 2026 Luxus Collection LLC · All Rights Reserved".' },
          defaultValue: '© 2026 Luxus Collection LLC · luxus-collection.com · All Rights Reserved',
        },
        {
          name: 'legalLine',
          type: 'textarea',
          label: 'Legal / FFL Compliance Line',
          admin: { description: 'Shown on the right of the bottom bar. Include your FFL license number here — update it whenever your license renews.' },
          defaultValue: 'All transactions conducted in full compliance with federal, state, and local firearms laws. FFL transfers required. Licensed Federal Firearms Dealer · License #1-59-XXX-XX-XX-55688.',
        },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      label: 'Analytics & Tracking',
      admin: { description: 'Paste your IDs here — scripts load automatically on every page. Leave a field blank to disable that service.' },
      fields: [
        {
          name: 'googleAnalyticsId',
          type: 'text',
          label: 'Google Analytics 4 — Measurement ID',
          admin: { description: 'Found in GA4 → Admin → Data Streams → your stream. Format: G-XXXXXXXXXX', placeholder: 'G-XXXXXXXXXX' },
        },
        {
          name: 'postHogApiKey',
          type: 'text',
          label: 'PostHog — Project API Key',
          admin: { description: 'Found in PostHog → Project Settings → Project API Key. Format: phc_XXXXXXXXXX', placeholder: 'phc_XXXXXXXXXX' },
        },
        {
          name: 'semrushVerification',
          type: 'text',
          label: 'SEMrush — Site Verification Code',
          admin: { description: 'From SEMrush → Site Audit (or Domain Overview) → verify ownership → HTML tag method. Paste only the code value from the content="" attribute, not the full tag.' },
        },
      ],
    },
  ],
}
