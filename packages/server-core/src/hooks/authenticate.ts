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

import * as authentication from '@feathersjs/authentication'
import { HookContext, Paginated } from '@feathersjs/feathers'

import { UserApiKeyType, userApiKeyPath } from '@etherealengine/engine/src/schemas/user/user-api-key.schema'
import { userPath } from '@etherealengine/engine/src/schemas/user/user.schema'
import { isProvider } from 'feathers-hooks-common'
import config from '../appconfig'
import { Application } from './../../declarations'

const { authenticate } = authentication.hooks

export default () => {
  return async (context: HookContext<Application>): Promise<HookContext> => {
    if (!context.params) context.params = {}
    const { params } = context

    // no need to authenticate if it's an internal call, but we still want to ensure the user is set
    const isInternal = isProvider('server')(context)
    if (isInternal) return context

    const authHeader = params.headers?.authorization
    let authSplit
    if (authHeader) authSplit = authHeader.split(' ')
    let token, user
    if (authSplit) token = authSplit[1]
    if (token) {
      const key = (await context.app.service(userApiKeyPath).find({
        query: {
          token: token
        }
      })) as Paginated<UserApiKeyType>
      if (key.data.length > 0) user = await context.app.service(userPath).get(key.data[0].userId)
    }
    if (user) {
      context.params.user = user
      return context
    }
    context = await authenticate('jwt')(context as any)
    // if (!context.params[config.authentication.entity]?.userId) throw new BadRequest('Must authenticate with valid JWT or login token')
    if (context.params[config.authentication.entity]?.userId)
      context.params.user = await context.app.service(userPath).get(context.params[config.authentication.entity].userId)
    return context
  }
}
