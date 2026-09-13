import { urlFor } from "@/sanity/lib/image";
import { Component } from '@/app/components/page'
import ItemCard from './shared/ItemCard'

export default function ComponentsGrid({ components }: { components: Component[] }) {
  return (
    <>            {components.length > 0 ? (
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
            )}</>
  );
}