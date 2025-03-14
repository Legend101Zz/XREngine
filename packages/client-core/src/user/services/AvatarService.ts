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

import { Paginated } from '@feathersjs/feathers'

import { EntityUUID } from '@etherealengine/common/src/interfaces/EntityUUID'
import { StaticResourceInterface } from '@etherealengine/common/src/interfaces/StaticResourceInterface'
import { AvatarNetworkAction } from '@etherealengine/engine/src/avatar/state/AvatarNetworkState'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'
import { avatarPath, AvatarType } from '@etherealengine/engine/src/schemas/user/avatar.schema'
import { defineState, dispatchAction, getMutableState, getState } from '@etherealengine/hyperflux'

import { UserID, userPath, UserType } from '@etherealengine/engine/src/schemas/user/user.schema'
import { uploadToFeathersService } from '../../util/upload'
import { AuthState } from './AuthService'

export const AVATAR_PAGE_LIMIT = 100

export const AvatarState = defineState({
  name: 'AvatarState',
  initial: () => ({
    avatarList: [] as Array<AvatarType>,
    search: undefined as string | undefined,
    skip: 0,
    limit: AVATAR_PAGE_LIMIT,
    total: 0
  })
})

export const AvatarService = {
  async createAvatar(model: File, thumbnail: File, avatarName: string, isPublic: boolean) {
    const newAvatar = await Engine.instance.api.service(avatarPath).create({
      name: avatarName,
      isPublic
    })

    await AvatarService.uploadAvatarModel(model, thumbnail, newAvatar.identifierName, isPublic, newAvatar.id)

    if (!isPublic) {
      const selfUser = getState(AuthState).user
      const userId = selfUser.id!
      await AvatarService.updateUserAvatarId(userId, newAvatar.id)
    }
  },

  async fetchAvatarList(search?: string, incDec?: 'increment' | 'decrement') {
    const avatarState = getMutableState(AvatarState)
    const skip = avatarState.skip.value
    const newSkip =
      incDec === 'increment' ? skip + AVATAR_PAGE_LIMIT : incDec === 'decrement' ? skip - AVATAR_PAGE_LIMIT : skip
    const result = (await Engine.instance.api.service(avatarPath).find({
      query: {
        search,
        $skip: newSkip,
        $limit: AVATAR_PAGE_LIMIT
      }
    })) as Paginated<AvatarType>

    avatarState.merge({
      search,
      skip,
      total: result.total,
      avatarList: result.data
    })
  },

  async patchAvatar(
    originalAvatar: AvatarType,
    avatarName: string,
    updateModels: boolean,
    avatarFile?: File,
    thumbnailFile?: File
  ) {
    let payload = {
      modelResourceId: originalAvatar.modelResourceId,
      thumbnailResourceId: originalAvatar.thumbnailResourceId,
      name: avatarName
    }

    if (updateModels && avatarFile && thumbnailFile) {
      const uploadResponse = await AvatarService.uploadAvatarModel(
        avatarFile,
        thumbnailFile,
        avatarName + '_' + originalAvatar.id,
        originalAvatar.isPublic,
        originalAvatar.id
      )

      const removalPromises: Promise<StaticResourceInterface>[] = []
      if (uploadResponse[0].id !== originalAvatar.modelResourceId)
        removalPromises.push(AvatarService.removeStaticResource(originalAvatar.modelResourceId))
      if (uploadResponse[1].id !== originalAvatar.thumbnailResourceId)
        removalPromises.push(AvatarService.removeStaticResource(originalAvatar.thumbnailResourceId))
      await Promise.all(removalPromises)

      payload = {
        modelResourceId: uploadResponse[0].id,
        thumbnailResourceId: uploadResponse[1].id,
        name: avatarName
      }
    }

    const avatar = await Engine.instance.api.service(avatarPath).patch(originalAvatar.id, payload)
    getMutableState(AvatarState).avatarList.set((prevAvatarList) => {
      const index = prevAvatarList.findIndex((item) => item.id === avatar.id)
      prevAvatarList[index] = avatar
      return prevAvatarList
    })

    const authState = getState(AuthState)
    const userAvatarId = authState.user?.avatarId
    if (userAvatarId === avatar.id) {
      const userId = authState.user?.id!
      await AvatarService.updateUserAvatarId(userId, avatar.id)
    }
  },

  async removeStaticResource(id: string) {
    return Engine.instance.api.service('static-resource').remove(id)
  },

  async updateUserAvatarId(userId: UserID, avatarId: string) {
    const res = (await Engine.instance.api.service(userPath).patch(userId, { avatarId: avatarId })) as UserType
    getMutableState(AuthState).user.avatarId.set(res.avatarId!)
    dispatchAction(
      AvatarNetworkAction.setAvatarID({
        avatarID: avatarId,
        entityUUID: userId as string as EntityUUID
      })
    )
  },

  async uploadAvatarModel(avatar: File, thumbnail: File, avatarName: string, isPublic: boolean, avatarId?: string) {
    return uploadToFeathersService('upload-asset', [avatar, thumbnail], {
      type: 'user-avatar-upload',
      args: {
        avatarName,
        avatarId,
        isPublic
      }
    }).promise as Promise<StaticResourceInterface[]>
  },

  async getAvatar(id: string) {
    try {
      return Engine.instance.api.service(avatarPath).get(id)
    } catch (err) {
      return null
    }
  }
}
