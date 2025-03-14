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

import appRootPath from 'app-root-path'
import * as path from 'path'
import * as pug from 'pug'

import { Invite as InviteType } from '@etherealengine/engine/src/schemas/interfaces/Invite'
import { locationPath } from '@etherealengine/engine/src/schemas/social/location.schema'
import {
  IdentityProviderType,
  identityProviderPath
} from '@etherealengine/engine/src/schemas/user/identity-provider.schema'

import { ChannelID } from '@etherealengine/common/src/dbmodels/Channel'
import { userRelationshipPath } from '@etherealengine/engine/src/schemas/user/user-relationship.schema'
import { UserType } from '@etherealengine/engine/src/schemas/user/user.schema'
import { Paginated } from '@feathersjs/feathers'
import { Application } from '../../declarations'
import logger from '../ServerLogger'
import { UserParams } from '../api/root-params'
import config from '../appconfig'
import { getInviteLink, sendEmail, sendSms } from '../user/auth-management/auth-management.utils'

export type InviteDataType = InviteType

const emailAccountTemplatesPath = path.join(appRootPath.path, 'packages', 'server-core', 'email-templates', 'invite')

async function generateEmail(
  app: Application,
  result: InviteDataType,
  toEmail: string,
  inviteType: string,
  inviterUsername: string,
  targetObjectId?: string
): Promise<void> {
  let channelName, locationName
  const hashLink = getInviteLink(inviteType, result.id, result.passcode)

  const templatePath = path.join(emailAccountTemplatesPath, `magiclink-email-invite-${inviteType}.pug`)

  if (inviteType === 'channel') {
    const channel = await app.service('channel').get(targetObjectId! as ChannelID)
    channelName = channel.name
  }

  if (inviteType === 'location') {
    const location = await app.service(locationPath).get(targetObjectId!)
    locationName = location.name
  }

  if (inviteType === 'instance') {
    const instance = await app.service('instance').get(targetObjectId!)
    const location = await app.service(locationPath).get(instance.locationId!)
    locationName = location.name
  }

  const compiledHTML = pug.compileFile(templatePath)({
    logo: config.client.logo,
    title: config.client.title,
    channelName: channelName,
    locationName: locationName,
    inviterUsername: inviterUsername,
    hashLink
  })
  const mailSender = config.email.from
  const email = {
    from: mailSender,
    to: toEmail,
    subject: config.client.title + ' ' + (config.email.subject[inviteType] || 'Invitation'),
    html: compiledHTML
  }

  return await sendEmail(app, email)
}

async function generateSMS(
  app: Application,
  result: InviteDataType,
  mobile: string,
  inviteType: string,
  inviterUsername: string,
  targetObjectId?: string
): Promise<void> {
  let channelName, locationName
  const hashLink = getInviteLink(inviteType, result.id, result.passcode)
  if (inviteType === 'channel') {
    const channel = await app.service('channel').get(targetObjectId! as ChannelID)
    channelName = channel.name
  }

  if (inviteType === 'location') {
    const location = await app.service(locationPath).get(targetObjectId!)
    locationName = location.name
  }

  if (inviteType === 'instance') {
    const instance = await app.service('instance').get(targetObjectId!)
    const location = await app.service(locationPath).get(instance.locationId!)
    locationName = location.name
  }
  const templatePath = path.join(emailAccountTemplatesPath, `magiclink-sms-invite-${inviteType}.pug`)
  const compiledHTML = pug
    .compileFile(templatePath)({
      title: config.client.title,
      inviterUsername: inviterUsername,
      channelName: channelName,
      locationName: locationName,
      hashLink
    })
    .replace(/&amp;/g, '&') // Text message links can't have HTML escaped ampersands.

  const sms = {
    mobile,
    text: compiledHTML
  }
  return await sendSms(app, sms)
}

// This will attach the owner ID in the contact while creating/updating list item
export const sendInvite = async (app: Application, result: InviteDataType, params: UserParams) => {
  try {
    let token = ''
    if (result.identityProviderType === 'email' || (result.identityProviderType === 'sms' && result.token)) {
      token = result.token as string
    } else {
      token = result.inviteeId as string
    }
    const inviteType = result.inviteType
    const targetObjectId = result.targetObjectId

    const authUser = params.user as UserType

    if (result.identityProviderType === 'email') {
      await generateEmail(app, result, token, inviteType, authUser.name, targetObjectId)
    } else if (result.identityProviderType === 'sms') {
      await generateSMS(app, result, token, inviteType, authUser.name, targetObjectId)
    } else if (result.inviteeId != null) {
      if (inviteType === 'friend') {
        const existingRelationshipStatus = await app.service(userRelationshipPath)._find({
          query: {
            $or: [
              {
                userRelationshipType: 'friend'
              },
              {
                userRelationshipType: 'requested'
              }
            ],
            userId: result.userId,
            relatedUserId: result.inviteeId
          }
        })
        if (existingRelationshipStatus.total === 0) {
          await app.service(userRelationshipPath).create(
            {
              userRelationshipType: 'requested',
              userId: result.userId,
              relatedUserId: result.inviteeId
            },
            {}
          )
        }
      }

      const emailIdentityProviderResult = (await app.service(identityProviderPath).find({
        query: {
          userId: result.inviteeId,
          type: 'email'
        }
      })) as Paginated<IdentityProviderType>

      if (emailIdentityProviderResult.total > 0) {
        await generateEmail(
          app,
          result,
          emailIdentityProviderResult.data[0].token,
          inviteType,
          authUser.name,
          targetObjectId
        )
      } else {
        const SMSIdentityProviderResult = (await app.service(identityProviderPath).find({
          query: {
            userId: result.inviteeId,
            type: 'sms'
          }
        })) as Paginated<IdentityProviderType>

        if (SMSIdentityProviderResult.total > 0) {
          await generateSMS(
            app,
            result,
            SMSIdentityProviderResult.data[0].token,
            inviteType,
            authUser.name,
            targetObjectId
          )
        }
      }
    }
  } catch (err) {
    logger.error(err)
    return null!
  }
}
