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

import type { Params } from '@feathersjs/feathers'
import type { KnexAdapterOptions } from '@feathersjs/knex'
import { KnexAdapter } from '@feathersjs/knex'

import { Application } from '../../../declarations'

import { Paginated } from '@feathersjs/feathers'

import {
  GenerateTokenData,
  GenerateTokenPatch,
  GenerateTokenQuery,
  GenerateTokenType
} from '@etherealengine/engine/src/schemas/user/generate-token.schema'
import {
  IdentityProviderType,
  identityProviderPath
} from '@etherealengine/engine/src/schemas/user/identity-provider.schema'
import { RootParams } from '../../api/root-params'

export interface GenerateTokenParams extends RootParams<GenerateTokenQuery> {
  authentication?: any
}

/**
 * A class for GenerateToken service
 */

export class GenerateTokenService<
  T = GenerateTokenType,
  ServiceParams extends Params = GenerateTokenParams
> extends KnexAdapter<GenerateTokenType, GenerateTokenData, GenerateTokenParams, GenerateTokenPatch> {
  app: Application

  constructor(options: KnexAdapterOptions, app: Application) {
    super(options)
    this.app = app
  }

  async create(data: GenerateTokenData, params?: GenerateTokenParams) {
    const userId = params?.user?.id
    if (!data.token || !data.type) throw new Error('Must pass service and identity-provider token to generate JWT')
    const ipResult = (await this.app.service(identityProviderPath).find({
      query: {
        userId: userId,
        type: data.type,
        token: data.token
      }
    })) as Paginated<IdentityProviderType>
    if (ipResult.total > 0) {
      const ip = ipResult.data[0]

      const newToken = await this.app.service('authentication').createAccessToken({}, { subject: ip.id.toString() })
      return {
        token: newToken,
        type: data.type
      }
    } else return null
  }
}
