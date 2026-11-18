import {defineField, defineType} from 'sanity'

export const visitorFeedbackType = defineType({
  name: 'visitorFeedback',
  title: 'Visitor Feedback',
  type: 'document',

  fields: [
    defineField({
      name: 'feedbackId',
      title: 'Feedback ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'visitId',
      title: 'Visit ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'sourceResponseRow',
      title: 'Source Response Row',
      type: 'number',
    }),

    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'visitorName',
      title: 'Visitor Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'visitorId',
      title: 'Visitor ID',
      type: 'string',
    }),

    defineField({
      name: 'emailAddress',
      title: 'Email Address',
      type: 'string',
    }),

    defineField({
      name: 'visitDate',
      title: 'Visit Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'equipmentUsed',
      title: 'Equipment / Tools Used',
      type: 'string',
    }),

    defineField({
      name: 'purposeOfVisit',
      title: 'Purpose of Visit',
      type: 'text',
    }),

    defineField({
      name: 'feedbackComments',
      title: 'Feedback Comments',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'publicDisplayConsent',
      title: 'Public Display Consent',
      type: 'string',
      options: {
        list: ['YES', 'NO'],
      },
    }),

    defineField({
      name: 'moderationStatus',
      title: 'Moderation Status',
      type: 'string',
      options: {
        list: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      },
      initialValue: 'PENDING_REVIEW',
    }),

    defineField({
      name: 'reviewedBy',
      title: 'Reviewed By',
      type: 'string',
    }),

    defineField({
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime',
    }),

    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
    }),
  ],

  preview: {
    select: {
      title: 'visitorName',
      moderationStatus: 'moderationStatus',
      visitDate: 'visitDate',
    },
    prepare({title, moderationStatus, visitDate}) {
      const subtitleParts = [moderationStatus, visitDate].filter(Boolean)

      return {
        title: title || 'Unnamed Visitor',
        subtitle: subtitleParts.join(' · '),
      }
    },
  },
})
