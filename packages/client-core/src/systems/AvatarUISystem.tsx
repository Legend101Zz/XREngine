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

import { Not } from 'bitecs'
import { Consumer } from 'mediasoup-client/lib/Consumer'
import { useEffect } from 'react'
import { Group, Vector3 } from 'three'

import multiLogger from '@etherealengine/common/src/logger'
import { AvatarComponent } from '@etherealengine/engine/src/avatar/components/AvatarComponent'
import { easeOutElastic } from '@etherealengine/engine/src/common/functions/MathFunctions'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'
import { EngineState } from '@etherealengine/engine/src/ecs/classes/EngineState'
import { Entity } from '@etherealengine/engine/src/ecs/classes/Entity'
import { defineQuery, getComponent, hasComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { removeEntity } from '@etherealengine/engine/src/ecs/functions/EntityFunctions'
import { defineSystem } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'
import { InputSourceComponent } from '@etherealengine/engine/src/input/components/InputSourceComponent'
import { MediaSettingsState } from '@etherealengine/engine/src/networking/MediaSettingsState'
import { webcamVideoDataChannelType } from '@etherealengine/engine/src/networking/NetworkState'
import {
  NetworkObjectComponent,
  NetworkObjectOwnedTag
} from '@etherealengine/engine/src/networking/components/NetworkObjectComponent'
import { Physics, RaycastArgs } from '@etherealengine/engine/src/physics/classes/Physics'
import { CollisionGroups } from '@etherealengine/engine/src/physics/enums/CollisionGroups'
import { getInteractionGroups } from '@etherealengine/engine/src/physics/functions/getInteractionGroups'
import { SceneQueryType } from '@etherealengine/engine/src/physics/types/PhysicsTypes'
import { addObjectToGroup } from '@etherealengine/engine/src/scene/components/GroupComponent'
import { setVisibleComponent } from '@etherealengine/engine/src/scene/components/VisibleComponent'
import { applyVideoToTexture } from '@etherealengine/engine/src/scene/functions/applyScreenshareToTexture'
import { UserID } from '@etherealengine/engine/src/schemas/user/user.schema'
import { TransformComponent } from '@etherealengine/engine/src/transform/components/TransformComponent'
import { XRUIComponent } from '@etherealengine/engine/src/xrui/components/XRUIComponent'
import { createTransitionState } from '@etherealengine/engine/src/xrui/functions/createTransitionState'
import { getMutableState, getState, none } from '@etherealengine/hyperflux'

import { CameraComponent } from '@etherealengine/engine/src/camera/components/CameraComponent'
import { PhysicsState } from '@etherealengine/engine/src/physics/state/PhysicsState'
import { PopupMenuState } from '../user/components/UserMenu/PopupMenuService'
import AvatarContextMenu from '../user/components/UserMenu/menus/AvatarContextMenu'
import { AvatarUIStateSystem } from './state/AvatarUIState'
import { createAvatarDetailView } from './ui/AvatarDetailView'
import { AvatarUIContextMenuState } from './ui/UserMenuView'

const logger = multiLogger.child({ component: 'client-core:systems' })

export const AvatarUI = new Map<Entity, ReturnType<typeof createAvatarDetailView>>()
export const AvatarUITransitions = new Map<Entity, ReturnType<typeof createTransitionState>>()

export const AvatarMenus = {
  AvatarContext: 'AvatarContext'
}

export const renderAvatarContextMenu = (userId: UserID, contextMenuEntity: Entity) => {
  const userEntity = NetworkObjectComponent.getUserAvatarEntity(userId)
  if (!userEntity) return

  const contextMenuXRUI = getComponent(contextMenuEntity, XRUIComponent)
  if (!contextMenuXRUI) return

  const userTransform = getComponent(userEntity, TransformComponent)
  const cameraPosition = getComponent(Engine.instance.cameraEntity, TransformComponent).position
  const { avatarHeight } = getComponent(userEntity, AvatarComponent)

  const cameraTransform = getComponent(Engine.instance.cameraEntity, TransformComponent)

  contextMenuXRUI.scale.setScalar(Math.max(1, cameraPosition.distanceTo(userTransform.position) / 3))
  contextMenuXRUI.position.copy(userTransform.position)
  contextMenuXRUI.position.y += avatarHeight - 0.3
  contextMenuXRUI.position.x += 0.1
  contextMenuXRUI.position.z += contextMenuXRUI.position.z > cameraPosition.z ? -0.4 : 0.4
  contextMenuXRUI.quaternion.copy(cameraTransform.rotation)
}

const userQuery = defineQuery([AvatarComponent, TransformComponent, NetworkObjectComponent, Not(NetworkObjectOwnedTag)])

const _vector3 = new Vector3()

let videoPreviewTimer = 0

const applyingVideo = new Map()

/** XRUI Clickaway */
const onPrimaryClick = () => {
  const state = getMutableState(AvatarUIContextMenuState)
  if (state.id.value !== '') {
    const layer = getComponent(state.ui.entity.value, XRUIComponent)
    const hit = layer.hitTest(Engine.instance.pointerScreenRaycaster.ray)
    if (!hit) {
      state.id.set('')
      setVisibleComponent(state.ui.entity.value, false)
    }
  }
}

const interactionGroups = getInteractionGroups(CollisionGroups.Default, CollisionGroups.Avatars)
const raycastComponentData = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: new Vector3(),
  maxDistance: 20,
  groups: interactionGroups
} as RaycastArgs

const onSecondaryClick = () => {
  const { physicsWorld } = getState(PhysicsState)
  const hits = Physics.castRayFromCamera(
    getComponent(Engine.instance.cameraEntity, CameraComponent),
    Engine.instance.pointerState.position,
    physicsWorld,
    raycastComponentData
  )
  const state = getMutableState(AvatarUIContextMenuState)
  if (hits.length) {
    const hit = hits[0]
    const hitEntity = (hit.body?.userData as any)?.entity as Entity
    if (typeof hitEntity !== 'undefined' && hitEntity !== Engine.instance.localClientEntity) {
      if (hasComponent(hitEntity, NetworkObjectComponent)) {
        const userId = getComponent(hitEntity, NetworkObjectComponent).ownerId
        state.id.set(userId)
        // setVisibleComponent(state.ui.entity.value, true)
        return // successful hit
      }
    }
  }

  state.id.set('')
}

const execute = () => {
  const engineState = getState(EngineState)
  if (!engineState.isEngineInitialized) return

  const nonCapturedInputSource = InputSourceComponent.nonCapturedInputSourceQuery()[0]
  if (!nonCapturedInputSource) return

  const inputSource = getComponent(nonCapturedInputSource, InputSourceComponent)

  const keys = inputSource.buttons

  if (keys.PrimaryClick?.down) onPrimaryClick()
  if (keys.SecondaryClick?.down) onSecondaryClick()

  videoPreviewTimer += engineState.deltaSeconds
  if (videoPreviewTimer > 1) videoPreviewTimer = 0

  for (const userEntity of userQuery.enter()) {
    if (AvatarUI.has(userEntity)) {
      logger.info({ userEntity }, 'Entity already exists.')
      continue
    }
    const userId = getComponent(userEntity, NetworkObjectComponent).ownerId
    const ui = createAvatarDetailView(userId)
    const transition = createTransitionState(1, 'IN')
    AvatarUITransitions.set(userEntity, transition)
    const root = new Group()
    root.name = `avatar-ui-root-${userEntity}`
    ui.state.videoPreviewMesh.value.position.y += 0.3
    ui.state.videoPreviewMesh.value.visible = false
    root.add(ui.state.videoPreviewMesh.value)
    addObjectToGroup(ui.entity, root)
    AvatarUI.set(userEntity, ui)
  }

  const cameraTransform = getComponent(Engine.instance.cameraEntity, TransformComponent)

  const immersiveMedia = getState(MediaSettingsState).immersiveMedia

  /** Render immersive media bubbles */
  for (const userEntity of userQuery()) {
    const ui = AvatarUI.get(userEntity)
    if (!ui) continue
    const transition = AvatarUITransitions.get(userEntity)!
    const { avatarHeight } = getComponent(userEntity, AvatarComponent)
    const userTransform = getComponent(userEntity, TransformComponent)
    const xruiTransform = getComponent(ui.entity, TransformComponent)

    const videoPreviewMesh = ui.state.videoPreviewMesh.value
    _vector3.copy(userTransform.position).y += avatarHeight + (videoPreviewMesh.visible ? 0.1 : 0.3)

    const dist = cameraTransform.position.distanceTo(_vector3)

    if (dist > 25) transition.setState('OUT')
    if (dist < 20) transition.setState('IN')

    let springAlpha = transition.alpha

    transition.update(Engine.instance.deltaSeconds, (alpha) => {
      springAlpha = easeOutElastic(alpha)
    })

    xruiTransform.scale.setScalar(1.3 * Math.max(1, dist / 6) * Math.max(springAlpha, 0.001))
    xruiTransform.position.copy(_vector3)
    xruiTransform.rotation.copy(cameraTransform.rotation)

    if (Engine.instance.mediaNetwork)
      if (immersiveMedia && videoPreviewTimer === 0) {
        const { ownerId } = getComponent(userEntity, NetworkObjectComponent)
        const peers = Engine.instance.mediaNetwork.peers ? Array.from(Engine.instance.mediaNetwork.peers.values()) : []
        const peer = peers.find((peer) => {
          return peer.userId === ownerId
        })
        const consumer = Engine.instance.mediaNetwork!.consumers.find(
          (consumer) =>
            consumer.appData.peerID === peer?.peerID && consumer.appData.mediaTag === webcamVideoDataChannelType
        ) as Consumer
        const paused = consumer && (consumer as any).producerPaused
        if (videoPreviewMesh.material.map) {
          if (!consumer || paused) {
            videoPreviewMesh.material.map = null!
            videoPreviewMesh.visible = false
          }
        } else {
          if (consumer && !paused && !applyingVideo.has(ownerId)) {
            applyingVideo.set(ownerId, true)
            const track = (consumer as any).track
            const newVideoTrack = track.clone()
            const newVideo = document.createElement('video')
            newVideo.autoplay = true
            newVideo.id = `${ownerId}_video_immersive`
            newVideo.muted = true
            newVideo.setAttribute('playsinline', 'true')
            newVideo.srcObject = new MediaStream([newVideoTrack])
            newVideo.play()
            if (!newVideo.readyState) {
              newVideo.onloadeddata = () => {
                applyVideoToTexture(newVideo, videoPreviewMesh, 'fill')
                videoPreviewMesh.visible = true
                applyingVideo.delete(ownerId)
              }
            } else {
              applyVideoToTexture(newVideo, videoPreviewMesh, 'fill')
              videoPreviewMesh.visible = true
              applyingVideo.delete(ownerId)
            }
          }
        }
      }

    if (!immersiveMedia && videoPreviewMesh.material.map) {
      videoPreviewMesh.material.map = null!
      videoPreviewMesh.visible = false
    }
  }

  for (const userEntity of userQuery.exit()) {
    const entity = AvatarUI.get(userEntity)?.entity
    if (typeof entity !== 'undefined') removeEntity(entity) // todo - why does this cause a GroupQueryReactor unmount error?
    AvatarUI.delete(userEntity)
    AvatarUITransitions.delete(userEntity)
  }

  // const state = getState(AvatarUIContextMenuState)
  // if (state.id !== '') {
  //   renderAvatarContextMenu(state.id as UserID, state.ui.entity)
  // }
}

const reactor = () => {
  useEffect(() => {
    getMutableState(PopupMenuState).menus.merge({
      [AvatarMenus.AvatarContext]: AvatarContextMenu
    })

    return () => {
      removeEntity(getState(AvatarUIContextMenuState).ui.entity)
      getMutableState(PopupMenuState).menus[AvatarMenus.AvatarContext].set(none)
    }
  }, [])
  return null
}

export const AvatarUISystem = defineSystem({
  uuid: 'ee.client.AvatarUISystem',
  execute,
  reactor,
  subSystems: [AvatarUIStateSystem]
})
