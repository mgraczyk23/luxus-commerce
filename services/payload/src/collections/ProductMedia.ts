import type { CollectionConfig } from 'payload'

export const ProductMedia: CollectionConfig = {
  slug: 'product-media',
  admin: {
    useAsTitle: 'productHandle',
    group: 'Products',
    description: 'Upload 360° spin images and/or a 3D model file for a product. The handle must match the product URL in the storefront exactly.',
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'productHandle',
      type: 'text',
      required: true,
      index: true,
      unique: true,
      admin: {
        description: 'The product URL handle from Medusa — e.g. "colt-python-357". Must match the /product/[handle] URL exactly.',
        placeholder: 'colt-python-357',
      },
    },
    {
      name: 'spinImages',
      type: 'array',
      label: '360° Spin Images',
      admin: {
        description: 'Upload images in order — 0° through ~355°. Typically 36 photos shot every 10° on a turntable. Drag rows to reorder.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'modelFile',
      type: 'upload',
      label: '3D Model File (GLB)',
      relationTo: 'media',
      admin: {
        description: 'GLB or GLTF file created via photogrammetry (Polycam, Meshroom, etc.). Used for the interactive 3D viewer.',
        condition: () => true,
      },
    },
  ],
}
