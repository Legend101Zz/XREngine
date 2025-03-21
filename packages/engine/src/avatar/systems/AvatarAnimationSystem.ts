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

import { useEffect } from 'react'
import { Bone, Euler, MathUtils, Quaternion, Vector3 } from 'three'

import { insertionSort } from '@etherealengine/common/src/utils/insertionSort'
import { defineState, getState } from '@etherealengine/hyperflux'

import { Axis } from '../../common/constants/Axis3D'
import { V_000 } from '../../common/constants/MathConstants'
import { Engine } from '../../ecs/classes/Engine'
import { EngineState } from '../../ecs/classes/EngineState'
import { Entity } from '../../ecs/classes/Entity'
import { defineQuery, getComponent, getOptionalComponent } from '../../ecs/functions/ComponentFunctions'
import { defineSystem } from '../../ecs/functions/SystemFunctions'
import { createPriorityQueue } from '../../ecs/PriorityQueue'
import { NetworkObjectComponent } from '../../networking/components/NetworkObjectComponent'
import { RigidBodyComponent } from '../../physics/components/RigidBodyComponent'
import { GroupComponent } from '../../scene/components/GroupComponent'
import { VisibleComponent } from '../../scene/components/VisibleComponent'
import {
  compareDistanceToCamera,
  DistanceFromCameraComponent,
  FrustumCullCameraComponent
} from '../../transform/components/DistanceComponents'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { updateGroupChildren } from '../../transform/systems/TransformSystem'
import { isMobileXRHeadset } from '../../xr/XRState'
import { updateAnimationGraph } from '.././animation/AnimationGraph'
import { solveHipHeight } from '.././animation/HipIKSolver'
import { solveLookIK } from '.././animation/LookAtIKSolver'
import { solveTwoBoneIK } from '.././animation/TwoBoneIKSolver'
import { AnimationManager } from '.././AnimationManager'
import { AnimationComponent } from '.././components/AnimationComponent'
import { AvatarAnimationComponent, AvatarRigComponent } from '.././components/AvatarAnimationComponent'
import { AvatarIKTargetComponent } from '.././components/AvatarIKComponents'
import { LoopAnimationComponent } from '.././components/LoopAnimationComponent'
import { applyInputSourcePoseToIKTargets } from '.././functions/applyInputSourcePoseToIKTargets'
import { AvatarMovementSettingsState } from '.././state/AvatarMovementSettingsState'

export const AvatarAnimationState = defineState({
  name: 'AvatarAnimationState',
  initial: () => {
    const accumulationBudget = isMobileXRHeadset ? 3 : 6

    const priorityQueue = createPriorityQueue({
      accumulationBudget
    })
    Engine.instance.priorityAvatarEntities = priorityQueue.priorityEntities

    return {
      priorityQueue,
      sortedTransformEntities: [] as Entity[]
    }
  }
})

const _vector3 = new Vector3()
const _vec = new Vector3()
const _fwd = new Vector3()

// setComponent(entity, AvatarArmsTwistCorrectionComponent, {
//   LeftHandBindRotationInv: new Quaternion(),
//   LeftArmTwistAmount: 0.6,
//   RightHandBindRotationInv: new Quaternion(),
//   RightArmTwistAmount: 0.6
// })

const loopAnimationQuery = defineQuery([
  VisibleComponent,
  LoopAnimationComponent,
  AnimationComponent,
  AvatarAnimationComponent,
  AvatarRigComponent,
  GroupComponent
])
const avatarAnimationQuery = defineQuery([AnimationComponent, AvatarAnimationComponent, AvatarRigComponent])

const ikTargetQuery = defineQuery([AvatarIKTargetComponent])

const minimumFrustumCullDistanceSqr = 5 * 5 // 5 units

const filterPriorityEntities = (entity: Entity) =>
  Engine.instance.priorityAvatarEntities.has(entity) || entity === Engine.instance.localClientEntity

const filterFrustumCulledEntities = (entity: Entity) =>
  !(
    DistanceFromCameraComponent.squaredDistance[entity] > minimumFrustumCullDistanceSqr &&
    FrustumCullCameraComponent.isCulled[entity]
  )

const leftHandRotation = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, Math.PI))
const leftHandRotationOffset = new Quaternion().setFromEuler(new Euler(Math.PI * 0.4, -Math.PI * 0.1, 0))

const rightHandRotation = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0))
const rightHandRotationOffset = new Quaternion().setFromEuler(new Euler(-Math.PI * 0.4, Math.PI * 0.1, 0))

let avatarSortAccumulator = 0
const _quat = new Quaternion()

const execute = () => {
  const { priorityQueue, sortedTransformEntities } = getState(AvatarAnimationState)
  const { elapsedSeconds, deltaSeconds } = getState(EngineState)

  /**
   * 1 - Sort & apply avatar priority queue
   */

  let needsSorting = false
  avatarSortAccumulator += deltaSeconds
  if (avatarSortAccumulator > 1) {
    needsSorting = true
    avatarSortAccumulator = 0
  }

  for (const entity of avatarAnimationQuery.enter()) {
    sortedTransformEntities.push(entity)
    needsSorting = true
  }

  for (const entity of avatarAnimationQuery.exit()) {
    const idx = sortedTransformEntities.indexOf(entity)
    idx > -1 && sortedTransformEntities.splice(idx, 1)
    needsSorting = true
    priorityQueue.removeEntity(entity)
  }

  if (needsSorting) {
    insertionSort(sortedTransformEntities, compareDistanceToCamera)
  }

  const filteredSortedTransformEntities = sortedTransformEntities.filter(filterFrustumCulledEntities)

  for (let i = 0; i < filteredSortedTransformEntities.length; i++) {
    const entity = filteredSortedTransformEntities[i]
    const accumulation = Math.min(Math.exp(1 / (i + 1)) / 3, 1)
    priorityQueue.addPriority(entity, accumulation * accumulation)
  }

  priorityQueue.update()

  /**
   * 2 - Apply avatar animations
   */

  const avatarAnimationEntities = avatarAnimationQuery().filter(filterPriorityEntities)
  const loopAnimationEntities = loopAnimationQuery().filter(filterPriorityEntities)
  const ikEntities = ikTargetQuery()

  for (const entity of avatarAnimationEntities) {
    /**
     * Apply motion to velocity controlled animations
     */
    const animationComponent = getComponent(entity, AnimationComponent)
    const avatarAnimationComponent = getComponent(entity, AvatarAnimationComponent)
    const rigidbodyComponent = getOptionalComponent(entity, RigidBodyComponent)

    const delta = elapsedSeconds - avatarAnimationComponent.deltaAccumulator
    const deltaTime = delta * animationComponent.animationSpeed
    avatarAnimationComponent.deltaAccumulator = elapsedSeconds

    if (rigidbodyComponent) {
      // TODO: use x locomotion for side-stepping when full 2D blending spaces are implemented
      avatarAnimationComponent.locomotion.x = 0
      avatarAnimationComponent.locomotion.y = rigidbodyComponent.linearVelocity.y
      // lerp animated forward animation to smoothly animate to a stop
      avatarAnimationComponent.locomotion.z = Math.min(
        MathUtils.lerp(
          avatarAnimationComponent.locomotion.z || 0,
          _vector3.copy(rigidbodyComponent.linearVelocity).setComponent(1, 0).length(),
          10 * deltaTime
        ),
        getState(AvatarMovementSettingsState).runSpeed
      )
    } else {
      avatarAnimationComponent.locomotion.setScalar(0)
    }

    /**
     * Update animation graph
     */
    updateAnimationGraph(avatarAnimationComponent.animationGraph, deltaTime)

    /**
     * Apply retargeting
     */
    const rootBone = animationComponent.mixer.getRoot() as Bone
    const avatarRigComponent = getComponent(entity, AvatarRigComponent)
    const rig = avatarRigComponent.rig

    rootBone.traverse((bone: Bone) => {
      if (!bone.isBone) return

      const targetBone = rig[bone.name]
      if (!targetBone) {
        return
      }

      targetBone.quaternion.copy(bone.quaternion)

      // Only copy the root position
      if (targetBone === rig.Hips) {
        targetBone.position.copy(bone.position)
        targetBone.position.y *= avatarAnimationComponent.rootYRatio
      }
    })

    // TODO: Find a more elegant way to handle root motion
    const rootPos = AnimationManager.instance._defaultRootBone.position
    rig.Hips.position.setX(rootPos.x).setZ(rootPos.z)
  }

  /**
   * 3 - Get IK target pose from WebXR
   */

  applyInputSourcePoseToIKTargets()

  /**
   * 4 - Apply avatar IK
   */
  for (const entity of ikEntities) {
    /** Filter by priority queue */
    const networkObject = getComponent(entity, NetworkObjectComponent)
    const ownerEntity = NetworkObjectComponent.getUserAvatarEntity(networkObject.ownerId)
    if (!Engine.instance.priorityAvatarEntities.has(ownerEntity)) continue

    const transformComponent = getComponent(entity, TransformComponent)
    // If data is zeroed out, assume there is no input and do not run IK
    if (transformComponent.position.equals(V_000)) continue

    const { rig, handRadius } = getComponent(ownerEntity, AvatarRigComponent)

    _fwd.set(0, 0, 1).applyQuaternion(transformComponent.rotation)

    const ikComponent = getComponent(entity, AvatarIKTargetComponent)
    if (ikComponent.handedness === 'none') {
      _vec
        .set(
          transformComponent.matrix.elements[8],
          transformComponent.matrix.elements[9],
          transformComponent.matrix.elements[10]
        )
        .normalize() // equivalent to Object3D.getWorldDirection
      solveHipHeight(ownerEntity, transformComponent.position)
      solveLookIK(rig.Head, _vec)
    } else if (ikComponent.handedness === 'left') {
      rig.LeftForeArm.quaternion.setFromAxisAngle(Axis.X, Math.PI * -0.25)
      /** @todo see if this is still necessary */
      rig.LeftForeArm.updateWorldMatrix(true, true)
      solveTwoBoneIK(
        rig.LeftArm,
        rig.LeftForeArm,
        rig.LeftHand,
        _vector3.addVectors(transformComponent.position, _fwd.multiplyScalar(handRadius)),
        _quat.multiplyQuaternions(transformComponent.rotation, leftHandRotation),
        leftHandRotationOffset
      )
    } else if (ikComponent.handedness === 'right') {
      rig.RightForeArm.quaternion.setFromAxisAngle(Axis.X, Math.PI * 0.25)
      /** @todo see if this is still necessary */
      rig.RightForeArm.updateWorldMatrix(true, true)
      solveTwoBoneIK(
        rig.RightArm,
        rig.RightForeArm,
        rig.RightHand,
        _vector3.addVectors(transformComponent.position, _fwd.multiplyScalar(handRadius)),
        _quat.multiplyQuaternions(transformComponent.rotation, rightHandRotation),
        rightHandRotationOffset
      )
    }
  }

  /**
   * Since the scene does not automatically update the matricies for all objects, which updates bones,
   * we need to manually do it for Loop Animation Entities
   */
  for (const entity of loopAnimationEntities) updateGroupChildren(entity)

  /** Run debug */
  for (const entity of Engine.instance.priorityAvatarEntities) {
    const avatarRig = getComponent(entity, AvatarRigComponent)
    if (avatarRig?.helper) {
      avatarRig.rig.Hips.updateWorldMatrix(true, true)
      avatarRig.helper?.updateMatrixWorld(true)
    }
  }

  /** We don't need to ever calculate the matrices for ik targets, so mark them not dirty */
  for (const entity of ikEntities) {
    // delete TransformComponent.dirtyTransforms[entity]
  }
}

const reactor = () => {
  useEffect(() => {
    AnimationManager.instance.loadDefaultAnimations()
  }, [])
  return null
}

export const AvatarAnimationSystem = defineSystem({
  uuid: 'ee.engine.AvatarAnimationSystem',
  execute,
  reactor
})
