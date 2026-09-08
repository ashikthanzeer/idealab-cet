import Link from 'next/link'

type ItemCardProps = {
  name: string
  description?: string
  imageUrl?: string
  href: string
}

export default function ItemCard({
  name,
  description,
  imageUrl,
  href,
}: ItemCardProps) {
  return (
    <Link href={href} className="group block">
      <article className="overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md">
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="p-5">
          <h2 className="text-xl font-semibold">
            {name}
          </h2>

          {description && (
            <p className="mt-2 line-clamp-3 text-sm text-gray-600">
              {description}
            </p>
          )}

          <span className="mt-4 inline-block text-sm font-medium">
            View details →
          </span>
        </div>
      </article>
    </Link>
  )
}