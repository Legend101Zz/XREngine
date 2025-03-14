/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/EtherealEngine/etherealengine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Ethereal Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Ethereal Engine team.

All portions of the code written by the Ethereal Engine team are Copyright © 2021-2023 
Ethereal Engine. All Rights Reserved.
*/

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Static } from '@feathersjs/typebox'
import { getValidator, querySyntax, Type } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../validators'

export const chargebeeSettingPath = 'chargebee-setting'

export const chargebeeSettingMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

// Main data model schema
export const chargebeeSettingSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid'
    }),
    url: Type.String(),
    apiKey: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
  },
  { $id: 'ChargebeeSetting', additionalProperties: false }
)
export type ChargebeeSettingType = Static<typeof chargebeeSettingSchema>

// Schema for creating new entries
export const chargebeeSettingDataSchema = Type.Pick(chargebeeSettingSchema, ['url', 'apiKey'], {
  $id: 'ChargebeeSettingData'
})
export type ChargebeeSettingData = Static<typeof chargebeeSettingDataSchema>

// Schema for updating existing entries
export const chargebeeSettingPatchSchema = Type.Partial(chargebeeSettingSchema, {
  $id: 'ChargebeeSettingPatch'
})
export type ChargebeeSettingPatch = Static<typeof chargebeeSettingPatchSchema>

// Schema for allowed query properties
export const chargebeeSettingQueryProperties = Type.Pick(chargebeeSettingSchema, ['id', 'url', 'apiKey'])
export const chargebeeSettingQuerySchema = Type.Intersect(
  [
    querySyntax(chargebeeSettingQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ChargebeeSettingQuery = Static<typeof chargebeeSettingQuerySchema>

export const chargebeeSettingValidator = getValidator(chargebeeSettingSchema, dataValidator)
export const chargebeeSettingDataValidator = getValidator(chargebeeSettingDataSchema, dataValidator)
export const chargebeeSettingPatchValidator = getValidator(chargebeeSettingPatchSchema, dataValidator)
export const chargebeeSettingQueryValidator = getValidator(chargebeeSettingQuerySchema, queryValidator)
