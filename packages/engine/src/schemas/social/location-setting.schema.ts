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
import { getValidator, querySyntax, StringEnum, Type } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../validators'

export const locationSettingPath = 'location-setting'

export const locationSettingMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

// Main data model schema
export const locationSettingSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid'
    }),
    locationId: Type.String({
      format: 'uuid'
    }),
    locationType: StringEnum(['private', 'public', 'showroom']),
    audioEnabled: Type.Boolean(),
    screenSharingEnabled: Type.Boolean(),
    faceStreamingEnabled: Type.Boolean(),
    videoEnabled: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
  },
  { $id: 'LocationSetting', additionalProperties: false }
)
export type LocationSettingType = Static<typeof locationSettingSchema>

// Schema for creating new entries
export const locationSettingDataSchema = Type.Pick(
  locationSettingSchema,
  ['locationId', 'locationType', 'audioEnabled', 'screenSharingEnabled', 'faceStreamingEnabled', 'videoEnabled'],
  {
    $id: 'LocationSettingData'
  }
)
export type LocationSettingData = Static<typeof locationSettingDataSchema>

// Schema for updating existing entries
export const locationSettingPatchSchema = Type.Partial(locationSettingSchema, {
  $id: 'LocationSettingPatch'
})
export type LocationSettingPatch = Static<typeof locationSettingPatchSchema>

// Schema for allowed query properties
export const locationSettingQueryProperties = Type.Pick(locationSettingSchema, [
  'id',
  'locationId',
  'locationType',
  'audioEnabled',
  'screenSharingEnabled',
  'faceStreamingEnabled',
  'videoEnabled'
])
export const locationSettingQuerySchema = Type.Intersect(
  [
    querySyntax(locationSettingQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type LocationSettingQuery = Static<typeof locationSettingQuerySchema>

export const locationSettingValidator = getValidator(locationSettingSchema, dataValidator)
export const locationSettingDataValidator = getValidator(locationSettingDataSchema, dataValidator)
export const locationSettingPatchValidator = getValidator(locationSettingPatchSchema, dataValidator)
export const locationSettingQueryValidator = getValidator(locationSettingQuerySchema, queryValidator)
