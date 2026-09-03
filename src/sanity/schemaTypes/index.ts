import {type SchemaTypeDefinition} from 'sanity'
import {componentType} from './component'
import {toolType} from './tool'
import {siteSettingsType} from './siteSettings'

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [componentType, toolType, siteSettingsType],
}