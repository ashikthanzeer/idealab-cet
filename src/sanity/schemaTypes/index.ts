import {type SchemaTypeDefinition} from 'sanity'
import {componentType} from './component'
import {toolType} from './tool'
import {siteSettingsType} from './siteSettings'
import { galleryItemType } from './galleryItem'
import {visitorFeedbackType} from './visitorFeedback'

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [componentType, toolType, siteSettingsType, galleryItemType, visitorFeedbackType],
}