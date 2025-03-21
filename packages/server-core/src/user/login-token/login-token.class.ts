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
import crypto from 'crypto'
import moment from 'moment'
import config from '../../appconfig'

import {
  LoginTokenData,
  LoginTokenPatch,
  LoginTokenQuery,
  LoginTokenType
} from '@etherealengine/engine/src/schemas/user/login-token.schema'

import { Application } from '../../../declarations'
import { RootParams } from '../../api/root-params'
import { toDateTimeSql } from '../../util/get-datetime-sql'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LoginTokenParams extends RootParams<LoginTokenQuery> {}

/**
 * A class for LoginToken service
 */

export class LoginTokenService<T = LoginTokenType, ServiceParams extends Params = LoginTokenParams> extends KnexAdapter<
  LoginTokenType,
  LoginTokenData,
  LoginTokenParams,
  LoginTokenPatch
> {
  app: Application

  constructor(options: KnexAdapterOptions, app: Application) {
    super(options)
    this.app = app
  }
  async create(data: LoginTokenData, params?: LoginTokenParams) {
    const token = crypto.randomBytes(config.authentication.bearerToken.numBytes).toString('hex')

    return await super._create({ ...data, token, expiresAt: toDateTimeSql(moment().utc().add(2, 'days').toDate()) })
  }
}
