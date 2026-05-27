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
  ],
}
