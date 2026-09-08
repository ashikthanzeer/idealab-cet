import {defineQuery} from 'next-sanity'

/* ─────────────────────────────────────────
   Components
   ───────────────────────────────────────── */

export const componentsQuery = defineQuery(`
  *[_type == "component"] | order(order asc) {
    _id,
    name,
    slug,
    shortDescription,
    image,
    featured,
    order
  }
`)

export const componentBySlugQuery = defineQuery(`
  *[
    _type == "component" &&
    slug.current == $slug
  ][0] {
    _id,
    name,
    slug,
    shortDescription,
    description,
    image,
    gallery,
    specifications,
    featured,
    order
  }
`)

/* ─────────────────────────────────────────
   Tools
   ───────────────────────────────────────── */

export const toolsQuery = defineQuery(`
  *[_type == "tool"] | order(order asc) {
    _id,
    name,
    slug,
    shortDescription,
    image,
    featured,
    order
  }
`)

export const toolBySlugQuery = defineQuery(`
  *[
    _type == "tool" &&
    slug.current == $slug
  ][0] {
    _id,
    name,
    slug,
    shortDescription,
    description,
    image,
    gallery,
    specifications,
    featured,
    order
  }
`)

/* ─────────────────────────────────────────
   Site Settings
   ───────────────────────────────────────── */

export const siteSettingsQuery = defineQuery(`
  *[
    _type == "siteSettings" &&
    _id == "siteSettings"
  ][0] {
    _id,
    labName,
    heroTitle,
    heroDescription,
    heroImage,
    aboutTitle,
    aboutContent,
    contactEmail,
    contactPhone,
    address,
    logos
  }
`)

export const galleryQuery = defineQuery(`
  *[_type == "galleryItem"] | order(order asc) {
    _id,
    image,
    caption,
    category,
    order
  }
`)