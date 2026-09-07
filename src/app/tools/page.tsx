import { client } from '@/sanity/lib/client'
import { toolsQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import { Nav } from '../components/ui/Nav'
import ItemCard from '@/components/shared/ItemCard'

type Tool = {
  _id: string
  name: string
  slug?: {
    current: string
  }
  shortDescription?: string
  image?: {
    _type: string
    asset: {
      _ref: string
      _type: string
    }
  }
  featured?: boolean
  order?: number
}

export default async function ToolsPage() {
  const tools = await client.fetch<Tool[]>(toolsQuery)

  return (
    <div className="relative">
      <Nav />

      <main>
        {/* Page Header */}
        <section className="bg-secondary px-10 py-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase text-indigo-200">
              IDEA LAB CET
            </p>

            <h1 className="mt-3 text-5xl font-bold text-white md:text-6xl">
              Available{' '}
              <span className="text-primary-v2">
                Tools
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/80 md:text-lg">
              Explore the tools and equipment available at the AICTE IDEA Lab
              CET for fabrication, prototyping and hands-on innovation.
            </p>
          </div>
        </section>

        {/* Tools */}
        <section className="px-10 py-14">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="text-lg font-semibold uppercase">
                Tools Catalogue
              </p>

              <p className="mt-2 max-w-2xl font-medium text-neutral-600">
                Browse the available tools and learn more about their
                specifications and applications.
              </p>
            </div>

            {tools.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ItemCard
                    key={tool._id}
                    name={tool.name}
                    description={tool.shortDescription}
                    imageUrl={
                      tool.image
                        ? urlFor(tool.image)
                            .width(600)
                            .height(400)
                            .url()
                        : undefined
                    }
                    href={
                      tool.slug?.current
                        ? `/tools/${tool.slug.current}`
                        : '#'
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-300 bg-white p-10 text-center">
                <p className="font-medium text-neutral-600">
                  No tools are currently available.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-10 pb-8">
          <div className="mx-auto max-w-7xl rounded-xl bg-secondary px-6 py-6 md:px-8 md:py-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-row items-center gap-4">
                <i className="ph ph-wrench rounded-lg bg-primary p-3 text-3xl text-white" />

                <div>
                  <p className="text-lg font-semibold text-white">
                    Ready to build?
                  </p>

                  <p className="font-medium text-neutral-300">
                    Explore the tools available at the IDEA Lab CET.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}