import { urlFor } from "@/sanity/lib/image";
import { Tool } from "@/app/tools/page";
import ItemCard from "./shared/ItemCard";

export default function ToolsGrid({ tools }: { tools: Tool[] }) {
  return (
    <>
      {tools.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ItemCard
              key={tool._id}
              name={tool.name}
              description={tool.shortDescription}
              imageUrl={tool.image ? urlFor(tool.image).url() : undefined}
              href={tool.slug?.current ? `/tools/${tool.slug.current}` : "#"}
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
    </>
  );
}
