import { client } from '@/sanity/lib/client'
import { galleryQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import { Nav } from '../components/ui/Nav'
import Image from 'next/image'

type GalleryItem = {
  _id: string
  image?: {
    _type: string
    asset: {
      _ref: string
      _type: string
    }
  }
  caption?: string
  category?: string
  order?: number 
}

export default async function GalleryPage() {
  const galleryItems = await client.fetch<GalleryItem[]>(galleryQuery)

  return (
    <main className="min-h-screen bg-[#FDFDFD]">
      <Nav />

      <section className="bg-secondary px-6 py-16 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold uppercase tracking-wide text-primary-v2">
            AICTE IDEA LAB
          </p>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Lab Gallery
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
            Explore the IDEA Lab, its facilities, equipment, activities and
            student projects.
          </p>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {galleryItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((item) => (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-lg border border-neutral-300 bg-white p-2"
                >
                  {item.image && (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                      <img
                        src={urlFor(item.image)
                        .width(800)
                        .height(600)
                        .url()}
                        alt={item.caption || 'IDEA Lab'}
                        className="h-full w-full object-cover"
                        />
                    </div>
                  )}

                  {(item.caption || item.category) && (
                    <div className="px-1 pb-1 pt-3">

                      {item.category && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.category}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-gray-500">
                No gallery images are currently available.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}