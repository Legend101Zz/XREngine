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
import { UserID } from '@etherealengine/engine/src/schemas/user/user.schema'
import type { Static } from '@feathersjs/typebox'
import { getValidator, querySyntax, Type } from '@feathersjs/typebox'
import { TypedString } from '../../common/types/TypeboxUtils'
import { dataValidator, queryValidator } from '../validators'

export const locationBanPath = 'location-ban'

export const locationBanMethods = ['find', 'create', 'patch', 'remove', 'get'] as const

// Main data model schema
export const locationBanSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid'
    }),
    userId: TypedString<UserID>({
      format: 'uuid'
    }),
    locationId: Type.String({
      format: 'uuid'
    }),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
  },
  { $id: 'LocationBan', additionalProperties: false }
)
export type LocationBanType = Static<typeof locationBanSchema>

// Schema for creating new entries
export const locationBanDataSchema = Type.Pick(locationBanSchema, ['userId', 'locationId'], {
  $id: 'LocationBanData'
})
export type LocationBanData = Static<typeof locationBanDataSchema>

// Schema for updating existing entries
export const locationBanPatchSchema = Type.Partial(locationBanSchema, {
  $id: 'LocationBanPatch'
})
export type LocationBanPatch = Static<typeof locationBanPatchSchema>

// Schema for allowed query properties
export const locationBanQueryProperties = Type.Pick(locationBanSchema, ['id', 'userId', 'locationId'])
export const locationBanQuerySchema = Type.Intersect(
  [
    querySyntax(locationBanQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)

export type LocationBanQuery = Static<typeof locationBanQuerySchema>

export const locationBanValidator = getValidator(locationBanSchema, dataValidator)
export const locationBanDataValidator = getValidator(locationBanDataSchema, dataValidator)
export const locationBanPatchValidator = getValidator(locationBanPatchSchema, dataValidator)
export const locationBanQueryValidator = getValidator(locationBanQuerySchema, queryValidator)
