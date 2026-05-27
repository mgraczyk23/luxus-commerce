import type { CollectionConfig } from 'payload'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    description: 'Brand profiles — displayed on the About page and brand listing pages. Add a logo, origin, and description for each brand you carry.',
    defaultColumns: ['name', 'origin', 'featured', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Brand Name',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      unique: true,
      admin: {
        description: 'Must match the brand slug used in Medusa product attributes (e.g. "nighthawk-custom"). Used to link to /brand/[slug].',
      },
    },
    {
      name: 'origin',
      type: 'text',
      label: 'Origin / Location',
      admin: { placeholder: 'e.g. Claremore, Oklahoma' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Brand Description',
      admin: {
        description: 'Short paragraph shown on the About page brand tile and /brand/[slug] header. 2–4 sentences.',
        placeholder: 'e.g. Founded in 1995 by a group of competition shooters...',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Brand Logo',
      admin: {
        description: 'SVG or PNG with transparent background preferred. Used on the About page and brand listing header.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Show on About page',
      defaultValue: false,
      admin: {
        description: 'Only featured brands appear in the About page brand grid.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers appear first. Use 10, 20, 30… to leave room for reordering.',
      },
    },
  ],
}
