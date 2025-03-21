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

import { AuthenticationRequest } from '@feathersjs/authentication'
import { Paginated } from '@feathersjs/feathers'
import { random } from 'lodash'

import { avatarPath, AvatarType } from '@etherealengine/engine/src/schemas/user/avatar.schema'
import { githubRepoAccessRefreshPath } from '@etherealengine/engine/src/schemas/user/github-repo-access-refresh.schema'

import { identityProviderPath } from '@etherealengine/engine/src/schemas/user/identity-provider.schema'
import { userApiKeyPath, UserApiKeyType } from '@etherealengine/engine/src/schemas/user/user-api-key.schema'
import { userPath } from '@etherealengine/engine/src/schemas/user/user.schema'
import { Application } from '../../../declarations'
import config from '../../appconfig'
import getFreeInviteCode from '../../util/get-free-invite-code'
import makeInitialAdmin from '../../util/make-initial-admin'
import CustomOAuthStrategy, { CustomOAuthParams } from './custom-oauth'

export class GithubStrategy extends CustomOAuthStrategy {
  constructor(app: Application) {
    super()
    this.app = app
  }

  async getEntityData(profile: any, entity: any, params: CustomOAuthParams): Promise<any> {
    const baseData = await super.getEntityData(profile, null, {})
    const authResult = entity
      ? entity
      : await (this.app.service('authentication') as any).strategies.jwt.authenticate(
          { accessToken: params?.authentication?.accessToken },
          {}
        )
    const identityProvider = authResult[identityProviderPath] ? authResult[identityProviderPath] : authResult
    const userId = identityProvider ? identityProvider.userId : params?.query ? params.query.userId : undefined

    return {
      ...baseData,
      accountIdentifier: profile.login,
      oauthToken: params.access_token,
      type: 'github',
      userId
    }
  }

  async updateEntity(entity: any, profile: any, params: CustomOAuthParams): Promise<any> {
    const authResult = await (this.app.service('authentication') as any).strategies.jwt.authenticate(
      { accessToken: params?.authentication?.accessToken },
      {}
    )
    if (!entity.userId) {
      const avatars = (await this.app.service(avatarPath).find({ isInternal: true })) as Paginated<AvatarType>
      const code = await getFreeInviteCode(this.app)
      const newUser = await this.app.service(userPath).create({
        name: '',
        isGuest: false,
        inviteCode: code,
        avatarId: avatars[random(avatars.total - 1)].id,
        scopes: []
      })
      entity.userId = newUser.id
      await this.app.service(identityProviderPath)._patch(entity.id, {
        userId: newUser.id,
        oauthToken: params.access_token
      })
    } else
      await this.app.service(identityProviderPath)._patch(entity.id, {
        oauthToken: params.access_token
      })
    const identityProvider = authResult[identityProviderPath]
    const user = await this.app.service(userPath).get(entity.userId)
    await makeInitialAdmin(this.app, user.id)
    if (user.isGuest)
      await this.app.service(userPath).patch(entity.userId, {
        isGuest: false
      })
    const apiKey = (await this.app.service(userApiKeyPath).find({
      query: {
        userId: entity.userId
      }
    })) as Paginated<UserApiKeyType>
    if (apiKey.total === 0)
      await this.app.service(userApiKeyPath).create({
        userId: entity.userId
      })
    if (entity.type !== 'guest' && identityProvider.type === 'guest') {
      await this.app.service(identityProviderPath)._remove(identityProvider.id)
      await this.app.service(userPath).remove(identityProvider.userId)
      await this.app.service(githubRepoAccessRefreshPath).find(Object.assign({}, params, { user }))
      return super.updateEntity(entity, profile, params)
    }
    const existingEntity = await super.findEntity(profile, params)
    if (!existingEntity) {
      profile.userId = user.id
      profile.oauthToken = params.access_token
      const newIP = await super.createEntity(profile, params)
      if (entity.type === 'guest') await this.app.service(identityProviderPath)._remove(entity.id)
      await this.app.service(githubRepoAccessRefreshPath).find(Object.assign({}, params, { user }))
      return newIP
    } else if (existingEntity.userId === identityProvider.userId) {
      await this.app.service(githubRepoAccessRefreshPath).find(Object.assign({}, params, { user }))
      return existingEntity
    } else {
      throw new Error('Another user is linked to this account')
    }
  }

  async getRedirect(data: any, params: CustomOAuthParams): Promise<string> {
    const redirectHost = config.authentication.callback.github
    const type = params?.query?.userId ? 'connection' : 'login'
    if (data instanceof Error || Object.getPrototypeOf(data) === Error.prototype) {
      const err = data.message as string
      return redirectHost + `?error=${err}`
    } else {
      const token = data.accessToken as string
      const redirect = params.redirect!
      let parsedRedirect
      try {
        parsedRedirect = JSON.parse(redirect)
      } catch (err) {
        parsedRedirect = {}
      }
      const path = parsedRedirect.path
      const instanceId = parsedRedirect.instanceId
      let returned = redirectHost + `?token=${token}&type=${type}`
      if (path != null) returned = returned.concat(`&path=${path}`)
      if (instanceId != null) returned = returned.concat(`&instanceId=${instanceId}`)
      return returned
    }
  }

  async authenticate(authentication: AuthenticationRequest, originalParams: CustomOAuthParams) {
    if (authentication.error) {
      if (authentication.error.message === 'Bad credentials')
        throw new Error('You canceled the GitHub OAuth login flow')
      else throw new Error('There was a problem with the GitHub OAuth login flow: ' + authentication.error_description)
    }
    originalParams.access_token = authentication.access_token
    return super.authenticate(authentication, originalParams)
  }
}
export default GithubStrategy
