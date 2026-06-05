import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'staticPage',
  title: 'Static Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          { title: 'About Us', value: 'About Us' },
          { title: 'Contact Us', value: 'Contact Us' },
          { title: 'Privacy Policy', value: 'Privacy Policy' },
          { title: 'Terms and Conditions', value: 'Terms and Conditions' },
          { title: 'Shipping Policy', value: 'Shipping Policy' },
          { title: 'Refund Policy', value: 'Refund Policy' },
        ],
      }
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
})
