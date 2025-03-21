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

import React from 'react'

import { receiveActions } from '@etherealengine/hyperflux'

import { defineSystem } from '../ecs/functions/SystemFunctions'
import { AvatarState, AvatarStateReactor } from './state/AvatarNetworkState'
import { AvatarAnimationSystem } from './systems/AvatarAnimationSystem'
import { AvatarAutopilotSystem } from './systems/AvatarAutopilotSystem'
import { AvatarControllerSystem } from './systems/AvatarControllerSystem'
import { AvatarIKTargetSystem } from './systems/AvatarIKTargetSystem'
import { AvatarInputSystem } from './systems/AvatarInputSystem'
import { AvatarLoadingSystem } from './systems/AvatarLoadingSystem'
import { AvatarMovementSystem } from './systems/AvatarMovementSystem'
import { AvatarTeleportSystem } from './systems/AvatarTeleportSystem'
import { FlyControlSystem } from './systems/FlyControlSystem'

export const AvatarInputSystemGroup = defineSystem({
  uuid: 'ee.engine.avatar.AvatarInputSystemGroup',
  subSystems: [AvatarInputSystem, AvatarControllerSystem, AvatarTeleportSystem, FlyControlSystem, AvatarLoadingSystem]
})

export const AvatarSimulationSystemGroup = defineSystem({
  uuid: 'ee.engine.avatar.AvatarSimulationSystemGroup',

  subSystems: [AvatarMovementSystem, AvatarIKTargetSystem, AvatarAutopilotSystem],

  execute: () => {
    receiveActions(AvatarState)
  },

  reactor: () => {
    return <AvatarStateReactor />
  }
})

export const AvatarAnimationSystemGroup = defineSystem({
  uuid: 'ee.engine.avatar.AvatarAnimationSystemGroup',
  subSystems: [AvatarAnimationSystem]
})
