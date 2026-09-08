import { defineField, defineType } from 'sanity'

export const galleryItemType = defineType({
  name: 'galleryItem',
  title: 'Gallery',
  type: 'document',

  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
    }),

    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      initialValue: 0,
    }),
  ],

  preview: {
    select: {
      title: 'caption',
      media: 'image',
      subtitle: 'category',
    },
  },
})