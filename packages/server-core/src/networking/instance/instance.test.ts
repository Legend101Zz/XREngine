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
import assert from 'assert'
import { v1 } from 'uuid'

import { Instance } from '@etherealengine/common/src/interfaces/Instance'
import { destroyEngine } from '@etherealengine/engine/src/ecs/classes/Engine'
import { locationPath, LocationType } from '@etherealengine/engine/src/schemas/social/location.schema'

import { Application } from '../../../declarations'
import { createFeathersKoaApp } from '../../createApp'

const params = { isInternal: true } as any

describe('instance.test', () => {
  let app: Application

  before(async () => {
    app = createFeathersKoaApp()
    await app.setup()
    const name = `Test Location ${v1()}`
    const sceneId = `test-scene-${v1()}`

    testLocation = await app.service(locationPath).create(
      {
        name,
        slugifiedName: '',
        sceneId,
        maxUsersPerInstance: 30,
        locationSetting: {
          id: '',
          locationType: 'public',
          audioEnabled: true,
          videoEnabled: true,
          faceStreamingEnabled: false,
          screenSharingEnabled: false,
          locationId: '',
          createdAt: '',
          updatedAt: ''
        },
        isLobby: false,
        isFeatured: false
      },
      params
    )
  })

  after(() => {
    return destroyEngine()
  })

  let testLocation: LocationType
  let testInstance: Instance

  it('should create an instance', async () => {
    const instance = (await app.service('instance').create({ locationId: testLocation.id })) as Instance

    assert.ok(instance)
    assert.equal(instance.locationId, testLocation.id)
    assert.equal(instance.currentUsers, 0)
    assert.equal(instance.ended, false)

    testInstance = instance
  })

  it('should get that instance', async () => {
    const instance = await app.service('instance').get(testInstance.id)

    assert.ok(instance)
    assert.ok(instance.roomCode)
    assert.equal(instance.id, testInstance.id)
  })

  it('should find instances for admin', async () => {
    const instances = (await app.service('instance').find({
      action: 'admin'
    } as any)) as Paginated<Instance>

    assert.equal(instances.total, 1)
    assert.equal(instances.data[0].id, testInstance.id)
  })

  it('should have "total" in find method', async () => {
    const item = await app.service('instance').find({
      action: 'admin'
    } as any)

    assert.ok('total' in item)
  })

  it('should find active instances', async () => {
    const activeInstances = await app
      .service('instances-active')
      .find({ query: { sceneId: testLocation.sceneId }, ...params })

    assert.equal(activeInstances.length, 1)
    assert.equal(activeInstances[0].id, testInstance.id)
    assert.equal(activeInstances[0].currentUsers, 0)
    assert.equal(activeInstances[0].location, testLocation.id)
  })
})
