import {defineField, defineType} from 'sanity'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',

  fields: [
    defineField({
      name: 'labName',
      title: 'Lab Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'heroTitle',
      title: 'Hero Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'heroDescription',
      title: 'Hero Description',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'aboutTitle',
      title: 'About Section Title',
      type: 'string',
    }),

    defineField({
      name: 'aboutContent',
      title: 'About Section Content',
      type: 'array',
      of: [{type: 'block'}],
    }),

    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
    }),

    defineField({
      name: 'contactPhone',
      title: 'Contact Phone',
      type: 'string',
    }),

    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 3,
    }),

    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'labName',
      media: 'heroImage',
    },
  },
})