import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Comments } from './collections/Comments'
import { Subscribers } from './collections/Subscribers'
import { Brands } from './collections/Brands'
import { SiteSettings } from './globals/SiteSettings'
import { HeroSlides } from './globals/HeroSlides'
import { AboutPage } from './globals/AboutPage'
import { ShopTileImages } from './globals/ShopTileImages'
import { ShippingPolicy } from './globals/ShippingPolicy'
import { PrivacyPolicy } from './globals/PrivacyPolicy'
import { TermsPolicy } from './globals/TermsPolicy'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://api.luxus-collection.com/cms',
  csrf: [
    'https://api.luxus-collection.com',
    'https://luxus-collection.com',
  ],
  cors: [
    'https://luxus-collection.com',
    'https://dev.luxus-collection.com',
    'https://api.luxus-collection.com',
  ],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Luxus Collection CMS',
    },
  },
  collections: [Users, Media, Posts, Comments, Subscribers, Brands],
  globals: [SiteSettings, HeroSlides, AboutPage, ShopTileImages, ShippingPolicy, PrivacyPolicy, TermsPolicy],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: 'cms',
          generateFileURL: ({ filename, prefix }) => {
            const bucket = process.env.S3_BUCKET || 'luxus-collection-media'
            const region = process.env.S3_REGION || 'us-east-1'
            return `https://${bucket}.s3.${region}.amazonaws.com/${prefix}/${filename}`
          },
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'us-east-1',
      },
    }),
  ],
})
