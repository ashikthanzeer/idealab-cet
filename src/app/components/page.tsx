import { client } from '@/sanity/lib/client'
import { componentsQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import { Nav } from '../components/ui/Nav'
import ItemCard from '@/components/shared/ItemCard'

type Component = {
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

export default async function ComponentsPage() {
  const components = await client.fetch<Component[]>(componentsQuery)

  console.log(
  'COMPONENT LIST DATA:',
  JSON.stringify(components, null, 2)
)

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
                Components
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/80 md:text-lg">
              Explore the components available at the AICTE IDEA Lab CET
              for prototyping, experimentation and innovative projects.
            </p>
          </div>
        </section>

        {/* Components */}
        <section className="px-10 py-14">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="text-lg font-semibold uppercase">
                Components Catalogue
              </p>

              <p className="mt-2 max-w-2xl font-medium text-neutral-600">
                Browse the available components and learn more about their
                specifications and applications.
              </p>
            </div>

            {components.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {components.map((component) => (
                  <ItemCard
                    key={component._id}
                    name={component.name}
                    description={component.shortDescription}
                    imageUrl={
                      component.image
                      ? urlFor(component.image).url()
                      : undefined
                    }
                    href={
                      component.slug?.current
                        ? `/components/${component.slug.current}`
                        : '#'
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="border border-neutral-300 rounded-lg bg-white p-10 text-center">
                <p className="font-medium text-neutral-600">
                  No components are currently available.
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
                <i className="ph ph-lightbulb rounded-lg bg-primary p-3 text-3xl text-white" />

                <div>
                  <p className="text-lg font-semibold text-white">
                    Have an idea?
                  </p>

                  <p className="font-medium text-neutral-300">
                    Use the IDEA Lab components to turn it into a prototype.
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