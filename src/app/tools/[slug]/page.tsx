type Props = {
  params: Promise<{
    slug: string
  }>
}

export default async function ToolDetailPage({params}: Props) {
  const {slug} = await params

  return (
    <main>
      <h1>Tool</h1>
      <p>Slug: {slug}</p>
    </main>
  )
}