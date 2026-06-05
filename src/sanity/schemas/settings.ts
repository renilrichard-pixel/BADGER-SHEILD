import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'storeName',
      title: 'Store Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
    }),
    defineField({
      name: 'contactInformation',
      title: 'Contact Information',
      type: 'text',
    }),
    defineField({
      name: 'socialMediaLinks',
      title: 'Social Media Links',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'platform', title: 'Platform', type: 'string' },
          { name: 'url', title: 'URL', type: 'url' },
        ]
      }],
    }),
    defineField({
      name: 'shippingInformation',
      title: 'Shipping Information',
      type: 'text',
    }),
    defineField({
      name: 'returnPolicy',
      title: 'Return Policy',
      type: 'text',
    }),
  ],
})
