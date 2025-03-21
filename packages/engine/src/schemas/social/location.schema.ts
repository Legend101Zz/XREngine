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
import { locationAdminSchema } from './location-admin.schema'
import { locationAuthorizedUserSchema } from './location-authorized-user.schema'
import { locationBanSchema } from './location-ban.schema'
import { locationSettingSchema } from './location-setting.schema'

export const locationPath = 'location'

export const locationMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

// Main data model schema
export const locationSchema = Type.Object(
  {
    id: Type.String({
      format: 'uuid'
    }),
    name: Type.String(),
    sceneId: Type.String({
      format: 'uuid'
    }),
    slugifiedName: Type.String(),
    isLobby: Type.Boolean(),
    isFeatured: Type.Boolean(),
    maxUsersPerInstance: Type.Number(),
    locationSetting: Type.Ref(locationSettingSchema),
    locationAdmin: Type.Optional(Type.Ref(locationAdminSchema)),
    locationAuthorizedUsers: Type.Array(Type.Ref(locationAuthorizedUserSchema)),
    locationBans: Type.Array(Type.Ref(locationBanSchema)),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
  },
  { $id: 'Location', additionalProperties: false }
)
export type LocationType = Static<typeof locationSchema>

export type LocationDatabaseType = Omit<LocationType, 'locationSetting' | 'locationAuthorizedUsers' | 'locationBans'>

// Schema for creating new entries
export const locationDataSchema = Type.Pick(
  locationSchema,
  ['name', 'sceneId', 'slugifiedName', 'isLobby', 'isFeatured', 'maxUsersPerInstance', 'locationSetting'],
  {
    $id: 'LocationData'
  }
)
export type LocationData = Static<typeof locationDataSchema>

// Schema for updating existing entries
export const locationPatchSchema = Type.Partial(locationSchema, {
  $id: 'LocationPatch'
})
export type LocationPatch = Static<typeof locationPatchSchema>

// Schema for allowed query properties
export const locationQueryProperties = Type.Pick(locationSchema, [
  'id',
  'name',
  'sceneId',
  'slugifiedName',
  'isLobby',
  'isFeatured',
  'maxUsersPerInstance'
])
export const locationQuerySchema = Type.Intersect(
  [
    querySyntax(locationQueryProperties, {
      name: {
        $like: Type.String()
      },
      sceneId: {
        $like: Type.String()
      }
    }),
    // Add additional query properties here
    Type.Object(
      {
        adminnedLocations: Type.Optional(Type.Boolean()),
        search: Type.Optional(Type.String())
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type LocationQuery = Static<typeof locationQuerySchema>

export const locationValidator = getValidator(locationSchema, dataValidator)
export const locationDataValidator = getValidator(locationDataSchema, dataValidator)
export const locationPatchValidator = getValidator(locationPatchSchema, dataValidator)
export const locationQueryValidator = getValidator(locationQuerySchema, queryValidator)
