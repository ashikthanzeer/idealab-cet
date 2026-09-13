
import { urlFor } from "@/sanity/lib/image";


import type { GalleryItem } from "@/app/gallery/page";

export default function GallaryGrid({ galleryItems }: { galleryItems: GalleryItem[] }) {
    return(<> <div className="mx-auto max-w-7xl">
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
                </div></>)}