import type { CollectionConfig } from 'payload'

export const FeaturedClassifieds: CollectionConfig = {
  slug: 'featured-classifieds',
  admin: {
    useAsTitle: 'title',
    description: 'Listings shown in the Featured Classifieds preview section. Will integrate with the full Classifieds system when built.',
    defaultColumns: ['title', 'category', 'price', 'condition', 'active'],
  },
  access: { read: () => true },
  fields: [
    { name: 'title',     type: 'text',     label: 'Listing Title',  required: true },
    {
      name: 'price',
      type: 'number',
      label: 'Asking Price',
      admin: { description: 'In whole dollars. Leave blank if using Price Note instead.' },
    },
    {
      name: 'priceNote',
      type: 'text',
      label: 'Price Note',
      admin: { description: 'Overrides the numeric price display. E.g. "Make Offer" or "Contact for Price".' },
    },
    {
      name: 'condition',
      type: 'select',
      label: 'Condition',
      options: [
        { label: 'New / Unfired',  value: 'new'       },
        { label: 'Excellent',      value: 'excellent'  },
        { label: 'Very Good',      value: 'very-good'  },
        { label: 'Good',           value: 'good'       },
        { label: 'Fair',           value: 'fair'       },
      ],
    },
    {
      name: 'category',
      type: 'select',
      label: 'Firearm Type',
      options: [
        { label: 'Handgun',  value: 'Handgun'  },
        { label: 'Rifle',    value: 'Rifle'    },
        { label: 'Shotgun',  value: 'Shotgun'  },
        { label: 'Revolver', value: 'Revolver' },
        { label: 'Other',    value: 'Other'    },
      ],
    },
    { name: 'brand',       type: 'text',     label: 'Brand / Make' },
    { name: 'model',       type: 'text',     label: 'Model' },
    { name: 'caliber',     type: 'text',     label: 'Caliber' },
    { name: 'description', type: 'textarea', label: 'Description' },
    { name: 'location',    type: 'text',     label: 'Location (City, State)' },
    { name: 'listedBy',    type: 'text',     label: 'Listed By (display name)' },
    { name: 'featuredImage', type: 'upload', label: 'Listing Image', relationTo: 'media' },
    { name: 'sortOrder',   type: 'number',   label: 'Sort Order', admin: { description: 'Lower numbers appear first.' } },
    { name: 'active',      type: 'checkbox', label: 'Active / Visible', defaultValue: true },
  ],
}
