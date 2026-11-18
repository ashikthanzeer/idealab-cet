import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('component').title('Components'),
      S.documentTypeListItem('tool').title('Tools'),
      S.documentTypeListItem('galleryItem').title('Gallery'),
      S.divider(),
      S.listItem()
        .title('Visitor Feedback')
        .child(
          S.list()
            .title('Visitor Feedback')
            .items([
              S.listItem()
                .title('All Feedback')
                .child(
                  S.documentList()
                    .title('All Feedback')
                    .filter('_type == "visitorFeedback"'),
                ),
              S.listItem()
                .title('Pending Feedback')
                .child(
                  S.documentList()
                    .title('Pending Feedback')
                    .filter('_type == "visitorFeedback" && moderationStatus == "PENDING_REVIEW"'),
                ),
              S.listItem()
                .title('Approved Feedback')
                .child(
                  S.documentList()
                    .title('Approved Feedback')
                    .filter('_type == "visitorFeedback" && moderationStatus == "APPROVED"'),
                ),
              S.listItem()
                .title('Rejected Feedback')
                .child(
                  S.documentList()
                    .title('Rejected Feedback')
                    .filter('_type == "visitorFeedback" && moderationStatus == "REJECTED"'),
                ),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title('Site Settings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings'),
        ),
    ])
