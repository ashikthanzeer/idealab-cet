import {client} from '@/sanity/lib/client'
import {componentsQuery} from '@/sanity/lib/queries'

type Component = {
  _id: string
  name: string
  slug?: {
    current: string
  }
  shortDescription?: string
  featured?: boolean
  order?: number
}

export default async function Home() {
  const components = await client.fetch<Component[]>(componentsQuery)

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">IDEA Lab CET</h1>

      <h2 className="mt-8 text-2xl font-semibold">Components</h2>

      <ul className="mt-4 space-y-2">
        {components.map((component) => (
          <li key={component._id}>
            <strong>{component.name}</strong>
            <p>{component.shortDescription}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}