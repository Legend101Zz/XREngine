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

import { Message as MessageInterface } from '@etherealengine/engine/src/schemas/interfaces/Message'

import { UserID, userPath } from '@etherealengine/engine/src/schemas/user/user.schema'
import { Application } from '../../../declarations'
import { Message } from './message.class'
import messageDocs from './message.docs'
import hooks from './message.hooks'
import createModel from './message.model'

declare module '@etherealengine/common/declarations' {
  interface ServiceTypes {
    message: Message
  }
}

export const onCRUD =
  (app: Application) =>
  async (data: MessageInterface): Promise<any> => {
    data.sender = await app.service(userPath).get(data.senderId)
    const channelUsers = await app.service('channel-user').find({
      query: {
        channelId: data.channelId
      }
    })

    const userIds = (channelUsers as any).data.map((channelUser) => {
      return channelUser.userId
    })

    return Promise.all(userIds.map((userId: UserID) => app.channel(`userIds/${userId}`).send(data)))
  }

export default (app: Application) => {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  }

  const event = new Message(options, app)
  event.docs = messageDocs
  app.use('message', event)

  const service = app.service('message')

  service.hooks(hooks)

  service.publish('created', onCRUD(app))
  service.publish('removed', onCRUD(app))
  service.publish('patched', onCRUD(app))
}
