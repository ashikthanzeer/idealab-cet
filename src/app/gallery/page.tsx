import { client } from '@/sanity/lib/client'
import { galleryQuery } from '@/sanity/lib/queries'

import { Nav } from '../components/ui/Nav'

import GallaryGrid from '@/components/GallaryGrid'

export type GalleryItem = {
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
       <GallaryGrid galleryItems={galleryItems} />
      </section>
    </main>
  )
}