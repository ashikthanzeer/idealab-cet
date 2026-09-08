import { client } from '@/sanity/lib/client'
import { toolBySlugQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import { Nav } from '../../components/ui/Nav'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  params: Promise<{ slug: string }>
}

type Specification = {
  name: string
  value: string
}

type tool = {
  _id: string
  name: string
  slug?: {
    current: string
  }
  shortDescription?: string
  description?: unknown[]
  img?: {
    _type: string
    asset: {
      _ref: string
      _type: string
    }
  }
  gallery?: {
    _type: string
    asset: {
      _ref: string
      _type: string
    }
  }[]
  specifications?: Specification[]
  featured?: boolean
  order?: number
}

export default async function toolDetailPage({ params }: Props) {
  const { slug } = await params

  const tool = await client.fetch<tool | null>(
    toolBySlugQuery,
    { slug }
  )

  if (!tool) {
    return (
      <>
        <Nav />

        <main className="px-10 py-20">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="text-3xl font-bold text-secondary">
              tool Not Found
            </h1>

            <p className="mt-3 text-neutral-600">
              The tool you are looking for does not exist.
            </p>

            <Link
              href="/tools"
              className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 font-medium text-white"
            >
              Back to tools
            </Link>
          </div>
        </main>
      </>
    )
  }

  const imageUrl = tool.image
    ? urlFor(tool.image).width(1200).height(800).url()
    : undefined

  return (
    <div className="relative">
      <Nav />

      <main>
        {/* Header */}
        <section className="bg-secondary px-10 py-12">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/tools"
              className="text-sm font-medium text-indigo-200 hover:underline"
            >
              ← Back to tools
            </Link>

            <h1 className="mt-6 text-4xl font-bold text-white md:text-6xl">
              {tool.name}
            </h1>

            {tool.shortDescription && (
              <p className="mt-4 max-w-2xl text-lg font-medium text-white/80">
                {tool.shortDescription}
              </p>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section className="px-10 py-14">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-neutral-300 bg-white">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={tool.name}
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-400">
                  No image available
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-lg font-semibold uppercase">
                About
              </p>

              {tool.description &&
              tool.description.length > 0 ? (
                <div className="mt-4 space-y-4 text-base font-medium leading-7 text-neutral-700">
                  {/* Rich text rendering will be added here */}
                  <p>{tool.shortDescription}</p>
                </div>
              ) : (
                <p className="mt-4 text-base font-medium leading-7 text-neutral-700">
                  {tool.shortDescription}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Specifications */}
        {tool.specifications &&
          tool.specifications.length > 0 && (
            <section className="px-10 pb-14">
              <div className="mx-auto max-w-7xl">
                <p className="text-lg font-semibold uppercase">
                  Specifications
                </p>

                <div className="mt-5 overflow-hidden rounded-lg border border-neutral-300 bg-white">
                  {tool.specifications.map((specification, index) => (
                    <div
                      key={`${specification.name}-${index}`}
                      className="grid grid-cols-1 border-b border-neutral-200 last:border-b-0 md:grid-cols-2"
                    >
                      <div className="bg-neutral-50 px-5 py-4 font-semibold">
                        {specification.name}
                      </div>

                      <div className="px-5 py-4 text-neutral-700">
                        {specification.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

        {/* Gallery */}
        {tool.gallery && tool.gallery.length > 0 && (
          <section className="px-10 pb-14">
            <div className="mx-auto max-w-7xl">
              <p className="text-lg font-semibold uppercase">
                Gallery
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tool.gallery.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-video overflow-hidden rounded-lg border border-neutral-300"
                  >
                    <img
                      src={urlFor(image).width(600).height(400).url()}
                      alt={`${tool.name} - Image ${index + 1}`}
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="px-10 pb-8">
          <div className="mx-auto max-w-7xl rounded-xl bg-secondary px-6 py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  Explore more tools
                </p>

                <p className="mt-1 font-medium text-neutral-300">
                  Browse the complete IDEA Lab tools catalogue.
                </p>
              </div>

              <Link
                href="/tools"
                className="w-fit rounded-lg bg-primary px-4 py-2 font-semibold text-white"
              >
                View tools
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}