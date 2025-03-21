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

// This retargeting logic is based exokitxr retargeting system
// https://github.com/exokitxr/avatars
import { Bone, Object3D, Quaternion, Skeleton, SkinnedMesh, Vector3 } from 'three'

import { Object3DUtils } from '../common/functions/Object3DUtils'

export type BoneNames =
  | 'Root'
  | 'Hips'
  | 'Spine'
  | 'Spine1'
  | 'Spine2'
  | 'Neck'
  | 'Head'
  | 'LeftEye'
  | 'RightEye'
  | 'LeftShoulder'
  | 'LeftArm'
  | 'LeftForeArm'
  // | 'LeftForeArmTwist'
  | 'LeftHand'
  | 'LeftUpLeg'
  | 'LeftLeg'
  | 'LeftFoot'
  | 'RightShoulder'
  | 'RightArm'
  | 'RightForeArm'
  // | 'RightForeArmTwist'
  | 'RightHand'
  | 'RightUpLeg'
  | 'RightLeg'
  | 'RightFoot'
  | 'LeftHandPinky1'
  | 'LeftHandPinky2'
  | 'LeftHandPinky3'
  | 'LeftHandPinky4'
  | 'LeftHandPinky5'
  | 'LeftHandRing1'
  | 'LeftHandRing2'
  | 'LeftHandRing3'
  | 'LeftHandRing4'
  | 'LeftHandRing5'
  | 'LeftHandMiddle1'
  | 'LeftHandMiddle2'
  | 'LeftHandMiddle3'
  | 'LeftHandMiddle4'
  | 'LeftHandMiddle5'
  | 'LeftHandIndex1'
  | 'LeftHandIndex2'
  | 'LeftHandIndex3'
  | 'LeftHandIndex4'
  | 'LeftHandIndex5'
  | 'LeftHandThumb1'
  | 'LeftHandThumb2'
  | 'LeftHandThumb3'
  | 'LeftHandThumb4'
  | 'RightHandPinky1'
  | 'RightHandPinky2'
  | 'RightHandPinky3'
  | 'RightHandPinky4'
  | 'RightHandPinky5'
  | 'RightHandRing1'
  | 'RightHandRing2'
  | 'RightHandRing3'
  | 'RightHandRing4'
  | 'RightHandRing5'
  | 'RightHandMiddle1'
  | 'RightHandMiddle2'
  | 'RightHandMiddle3'
  | 'RightHandMiddle4'
  | 'RightHandMiddle5'
  | 'RightHandIndex1'
  | 'RightHandIndex2'
  | 'RightHandIndex3'
  | 'RightHandIndex4'
  | 'RightHandIndex5'
  | 'RightHandThumb1'
  | 'RightHandThumb2'
  | 'RightHandThumb3'
  | 'RightHandThumb4'

export type BoneStructure = {
  [bone in BoneNames]: Bone
}

const _getTailBones = (root: Bone): Bone[] => {
  const result: any[] = []

  root.traverse((bone: Bone) => {
    if (bone.children.length === 0) {
      if (!result.includes(bone)) {
        result.push(bone)
      }
    }
  })

  return result
}
const _findClosestParentBone = (bone, pred) => {
  for (; bone; bone = bone.parent) {
    if (pred(bone)) {
      return bone
    }
  }
  return null
}
const _findFurthestParentBone = (bone, pred) => {
  let result = null
  for (; bone; bone = bone.parent) {
    if (pred(bone)) {
      result = bone
    }
  }
  return result
}
const _distanceToParentBone = (bone, parentBone) => {
  for (let i = 0; bone; bone = bone.parent, i++) {
    if (bone === parentBone) {
      return i
    }
  }
  return Infinity
}
const _findClosestChildBone = (bone, pred) => {
  const _recurse = (bone) => {
    if (pred(bone)) {
      return bone
    } else {
      for (let i = 0; i < bone.children.length; i++) {
        const result = _recurse(bone.children[i])
        if (result) {
          return result
        }
      }
      return null
    }
  }
  return _recurse(bone)
}
const _traverseChild = (bone, distance) => {
  if (distance <= 0) {
    return bone
  } else {
    for (let i = 0; i < bone.children.length; i++) {
      const child = bone.children[i]
      const subchild = _traverseChild(child, distance - 1)
      if (subchild !== null) {
        return subchild
      }
    }
    return null
  }
}
const _countCharacters = (name, regex) => {
  let result = 0
  for (let i = 0; i < name.length; i++) {
    if (regex.test(name[i])) {
      result++
    }
  }
  return result
}
const _findHips = (root: Bone) => {
  let hips
  Object3DUtils.traverse(root, (bone: Bone) => {
    if (/hip|pelvis/i.test(bone.name)) {
      hips = bone
      return true
    }
  })
  return hips
}
const _findHead = (tailBones) => {
  const headBones = tailBones
    .map((tailBone) => {
      const headBone = _findFurthestParentBone(tailBone, (bone) => /head/i.test(bone.name))
      if (headBone) {
        return headBone
      } else {
        return null
      }
    })
    .filter((bone) => bone)
  const headBone = headBones.length > 0 ? headBones[0] : null
  if (headBone) {
    return headBone
  } else {
    return null
  }
}
const _findEye = (tailBones, left) => {
  const regexp = left ? /l/i : /r/i
  const eyeBones = tailBones
    .map((tailBone) => {
      const eyeBone = _findFurthestParentBone(
        tailBone,
        (bone) => /eye/i.test(bone.name) && regexp.test(bone.name.replace(/eye/gi, ''))
      )
      if (eyeBone) {
        return eyeBone
      } else {
        return null
      }
    })
    .filter((spec) => spec)
    .sort((a, b) => {
      const aName = a.name.replace(/shoulder|clavicle/gi, '')
      const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i)
      const bName = b.name.replace(/shoulder|clavicle/gi, '')
      const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i)
      if (!left) {
        return aLeftBalance - bLeftBalance
      } else {
        return bLeftBalance - aLeftBalance
      }
    })
  const eyeBone = eyeBones.length > 0 ? eyeBones[0] : null
  if (eyeBone) {
    return eyeBone
  } else {
    return null
  }
}
const _findSpine = (chest, hips) => {
  for (let bone = chest; bone; bone = bone.parent) {
    if (bone.parent === hips) {
      return bone
    }
  }
  return null
}
const _findShoulder = (tailBones, left) => {
  const regexp = left ? /l/i : /r/i
  const shoulderBones = tailBones
    .map((tailBone) => {
      const shoulderBone = _findClosestParentBone(
        tailBone,
        (bone) => /shoulder|clavicle/i.test(bone.name) && regexp.test(bone.name.replace(/shoulder|clavicle/gi, ''))
      )
      if (shoulderBone) {
        const distance = _distanceToParentBone(tailBone, shoulderBone)
        if (distance >= 3) {
          return {
            bone: shoulderBone,
            distance
          }
        } else {
          return null
        }
      } else {
        return null
      }
    })
    .filter((spec) => spec)
    .sort((a, b) => {
      const diff = b.distance - a.distance
      if (diff !== 0) {
        return diff
      } else {
        const aName = a.bone.name.replace(/shoulder|clavicle/gi, '')
        const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i)
        const bName = b.bone.name.replace(/shoulder|clavicle/gi, '')
        const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i)
        if (!left) {
          return aLeftBalance - bLeftBalance
        } else {
          return bLeftBalance - aLeftBalance
        }
      }
    })
  const shoulderBone = shoulderBones.length > 0 ? shoulderBones[0].bone : null
  if (shoulderBone) {
    return shoulderBone
  } else {
    return null
  }
}
const _findHand = (shoulderBone) => _findClosestChildBone(shoulderBone, (bone) => /hand|wrist/i.test(bone.name))
const _findFoot = (tailBones, left) => {
  const regexp = left ? /l/i : /r/i
  const legBones = tailBones
    .map((tailBone) => {
      const footBone = _findFurthestParentBone(
        tailBone,
        (bone) => /foot|ankle/i.test(bone.name) && regexp.test(bone.name.replace(/foot|ankle/gi, ''))
      )
      if (footBone) {
        const legBone = _findFurthestParentBone(
          footBone,
          (bone) => /leg|thigh/i.test(bone.name) && regexp.test(bone.name.replace(/leg|thigh/gi, ''))
        )
        if (legBone) {
          const distance = _distanceToParentBone(footBone, legBone)
          if (distance >= 2) {
            return {
              footBone,
              distance
            }
          } else {
            return null
          }
        } else {
          return null
        }
      } else {
        return null
      }
    })
    .filter((spec) => spec)
    .sort((a, b) => {
      const diff = b.distance - a.distance
      if (diff !== 0) {
        return diff
      } else {
        const aName = a.footBone.name.replace(/foot|ankle/gi, '')
        const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i)
        const bName = b.footBone.name.replace(/foot|ankle/gi, '')
        const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i)
        if (!left) {
          return aLeftBalance - bLeftBalance
        } else {
          return bLeftBalance - aLeftBalance
        }
      }
    })
  const footBone = legBones.length > 0 ? legBones[0].footBone : null
  if (footBone) {
    return footBone
  } else {
    return null
  }
}

const _findFinger = (r, left, parent) => {
  const fingerTipBone = parent.tailBones
    .filter(
      (bone) =>
        r.test(bone.name) &&
        _findClosestParentBone(bone, (bone) => bone === parent.Left_wrist || bone === parent.Right_wrist)
    )
    .sort((a, b) => {
      const aName = a.name.replace(r, '')
      const aLeftBalance = _countCharacters(aName, /l/i) - _countCharacters(aName, /r/i)
      const bName = b.name.replace(r, '')
      const bLeftBalance = _countCharacters(bName, /l/i) - _countCharacters(bName, /r/i)
      if (!left) {
        return aLeftBalance - bLeftBalance
      } else {
        return bLeftBalance - aLeftBalance
      }
    })
  const fingerRootBone =
    fingerTipBone.length > 0 ? _findFurthestParentBone(fingerTipBone[0], (bone) => r.test(bone.name)) : null
  return fingerRootBone
}

function fixSkeletonZForward(rootBone, context) {
  context = context || {}
  precalculateZForwards(rootBone, context)
  if (context.exclude) {
    const bones = [rootBone]
    rootBone.traverse((b) => bones.push(b))
    bones.forEach((b) => {
      if (~context.exclude.indexOf(b.id) || ~context.exclude.indexOf(b.name)) {
        delete context.averagedDirs[b.id]
      }
    })
  }
  return setZForward(rootBone, context)
}

function precalculateZForwards(rootBone, context) {
  context = context || rootBone
  context.worldPos = context.worldPos || {}
  context.averagedDirs = context.averagedDirs || {}
  context.preRotations = context.preRotations || {}
  getOriginalWorldPositions(rootBone, context.worldPos)
  calculateAverages(rootBone, context.worldPos, context.averagedDirs)
  return context
}

function setZForward(rootBone, context) {
  if (!context || !context.worldPos) {
    context = context || {}
    precalculateZForwards(rootBone, context)
  }
  updateTransformations(rootBone, context.worldPos, context.averagedDirs, context.preRotations)
  return context
}

function getOriginalWorldPositions(rootBone, worldPos) {
  const rootBoneWorldPos = rootBone.getWorldPosition(new Vector3())
  worldPos[rootBone.id] = [rootBoneWorldPos]
  rootBone.children.forEach((child) => {
    getOriginalWorldPositions(child, worldPos)
  })
}

function calculateAverages(parentBone, worldPos, averagedDirs) {
  const averagedDir = new Vector3()
  parentBone.children.forEach((childBone) => {
    //average the child bone world pos
    const childBonePosWorld = worldPos[childBone.id][0]
    averagedDir.add(childBonePosWorld)
  })

  averagedDir.multiplyScalar(1 / parentBone.children.length)
  averagedDirs[parentBone.id] = averagedDir

  parentBone.children.forEach((childBone) => {
    calculateAverages(childBone, worldPos, averagedDirs)
  })
}

function updateTransformations(parentBone, worldPos, averagedDirs, preRotations) {
  const averagedDir = averagedDirs[parentBone.id]
  if (averagedDir) {
    //set quaternion
    const RESETQUAT = new Quaternion()
    parentBone.quaternion.copy(RESETQUAT)
    // parentBone.quaternion.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI*2));
    parentBone.updateMatrixWorld()

    //get the child bone position in local coordinates
    // const childBoneDir = parentBone.worldToLocal(averagedDir.clone()).normalize();

    //set direction to face child
    // setQuaternionFromDirection(childBoneDir, Y_AXIS, parentBone.quaternion)
    // console.log('new quaternion', parentBone.quaternion.toArray().join(','));
  }
  const preRot = preRotations[parentBone.id] || preRotations[parentBone.name]
  if (preRot) parentBone.quaternion.multiply(preRot)
  // parentBone.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
  parentBone.updateMatrixWorld()

  //set child bone position relative to the new parent matrix.
  parentBone.children.forEach((childBone) => {
    const childBonePosWorld = worldPos[childBone.id][0].clone()
    parentBone.worldToLocal(childBonePosWorld)
    childBone.position.copy(childBonePosWorld)
  })

  parentBone.children.forEach((childBone) => {
    updateTransformations(childBone, worldPos, averagedDirs, preRotations)
  })
}

function findHandBones(handBone: Object3D) {
  let pinky1,
    pinky2,
    pinky3,
    pinky4,
    pinky5,
    ring1,
    ring2,
    ring3,
    ring4,
    ring5,
    middle1,
    middle2,
    middle3,
    middle4,
    middle5,
    index1,
    index2,
    index3,
    index4,
    index5,
    thumb1,
    thumb2,
    thumb3,
    thumb4

  const findBone = (parent: Object3D, name: string, index: string) => {
    const re = new RegExp(name, 'i')
    let result = null

    Object3DUtils.traverse(parent, (bone) => {
      if (re.test(bone.name) && bone.name.includes(index)) {
        result = bone
        return true
      }
    })

    return result
  }

  pinky1 = findBone(handBone, 'pinky', '1')
  pinky2 = findBone(handBone, 'pinky', '2')
  pinky3 = findBone(handBone, 'pinky', '3')
  pinky4 = findBone(handBone, 'pinky', '4')
  pinky5 = findBone(handBone, 'pinky', '5')
  ring1 = findBone(handBone, 'ring', '1')
  ring2 = findBone(handBone, 'ring', '2')
  ring3 = findBone(handBone, 'ring', '3')
  ring4 = findBone(handBone, 'ring', '4')
  ring5 = findBone(handBone, 'ring', '5')
  middle1 = findBone(handBone, 'middle', '1')
  middle2 = findBone(handBone, 'middle', '2')
  middle3 = findBone(handBone, 'middle', '3')
  middle4 = findBone(handBone, 'middle', '4')
  middle5 = findBone(handBone, 'middle', '5')
  index1 = findBone(handBone, 'index', '1')
  index2 = findBone(handBone, 'index', '2')
  index3 = findBone(handBone, 'index', '3')
  index4 = findBone(handBone, 'index', '4')
  index5 = findBone(handBone, 'index', '5')
  thumb1 = findBone(handBone, 'thumb', '1')
  thumb2 = findBone(handBone, 'thumb', '2')
  thumb3 = findBone(handBone, 'thumb', '3')
  thumb4 = findBone(handBone, 'thumb', '4')

  return {
    pinky1,
    pinky2,
    pinky3,
    pinky4,
    pinky5,
    ring1,
    ring2,
    ring3,
    ring4,
    ring5,
    middle1,
    middle2,
    middle3,
    middle4,
    middle5,
    index1,
    index2,
    index3,
    index4,
    index5,
    thumb1,
    thumb2,
    thumb3,
    thumb4
  } as Record<string, Bone>
}

export function findSkinnedMeshes(model: Object3D) {
  const meshes: SkinnedMesh[] = []
  model.traverse((obj: SkinnedMesh) => {
    if (obj.isSkinnedMesh) {
      meshes.push(obj)
    }
  })

  return meshes
}

/**
 * Creates a skeleton form given bone chain
 * @param bone first bone in the chain
 * @returns Skeleton
 */
export function createSkeletonFromBone(bone: Bone): Skeleton {
  const bones: Bone[] = []
  bone.traverse((b: Bone) => {
    if (b.isBone) bones.push(b)
  })

  const meshes = findSkinnedMeshes(Object3DUtils.findRoot(bone)!)
  const skeleton = new Skeleton(bones)

  // Calculated inverse matrixes by Skeleton class might not work
  // Copy from the source
  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i]
    let found = false

    for (let j = 0; j < meshes.length; j++) {
      const mesh = meshes[j]
      const { bones: meshBones, boneInverses } = mesh.skeleton
      const k = meshBones.findIndex((b) => b === bone)
      if (k < 0) continue
      skeleton.boneInverses[i].copy(boneInverses[k])
      found = true
      break
    }

    if (!found) {
      console.warn('Could not find the bone inverse', i)
    }
  }

  return skeleton
}

function findRootBone(bone: Bone): Bone {
  let node = bone
  while (node.parent && (node.parent as Bone).isBone) {
    node = node.parent as Bone
  }

  // Some models use Object3D as a root bone instead of Bone
  if (node.parent && /hip|pelvis/i.test(node.parent.name)) {
    node = node.parent as any
  }

  return node
}

function findFirstTwistChildBone(parent: Object3D, hand: Object3D, left: boolean): Bone {
  const existingBone = parent?.children?.find((child) => /twist/i.test(child.name)) as Bone
  // if (!existingBone) {
  //   const bone = new Bone()
  //   // const vec3 = hand.getWorldPosition(new Vector3()).sub(parent.getWorldPosition(new Vector3()))
  //   // bone.position.copy(vec3.multiplyScalar(0.5))
  //   hand.add(bone)
  //   bone.position.y += 0.1
  //   return bone
  // }
  return existingBone
}

export default function avatarBoneMatching(model: Object3D): BoneStructure {
  try {
    let Root = findRootBone(model.getObjectByProperty('type', 'Bone') as Bone)
    const skinnedMeshes = [] as SkinnedMesh[]
    model.traverse((obj: SkinnedMesh) => {
      if (obj.isSkinnedMesh) skinnedMeshes.push(obj)
    })
    Root.updateMatrixWorld(true)

    const Hips = _findHips(Root)
    const tailBones = _getTailBones(Root)
    const LeftEye = _findEye(tailBones, true)
    const RightEye = _findEye(tailBones, false)
    const Head = _findHead(tailBones)
    const Neck = Head.parent
    const Spine2 = Neck.parent
    const Spine1 = Spine2.parent
    const Spine = _findSpine(Spine2, Hips)
    const LeftShoulder = _findShoulder(tailBones, true)
    const LeftHand = _findHand(LeftShoulder)
    const LeftForeArm = LeftHand.parent
    // const LeftForeArmTwist = findFirstTwistChildBone(LeftForeArm, LeftHand, true)
    const LeftArm = LeftForeArm.parent
    const RightShoulder = _findShoulder(tailBones, false)
    const RightHand = _findHand(RightShoulder)
    const RightForeArm = RightHand.parent
    // const RightForeArmTwist = findFirstTwistChildBone(RightForeArm, RightHand, false)
    const RightArm = RightForeArm.parent
    const LeftFoot = _findFoot(tailBones, true)
    const LeftLeg = LeftFoot.parent
    const LeftUpLeg = LeftLeg.parent
    const RightFoot = _findFoot(tailBones, false)
    const RightLeg = RightFoot.parent
    const RightUpLeg = RightLeg.parent
    const leftHandBones = findHandBones(LeftHand)
    const rightHandBones = findHandBones(RightHand)

    // for (const mesh of skinnedMeshes) {
    //   if(!mesh.skeleton.bones.includes(LeftForeArmTwist))
    //     mesh.skeleton.bones.push(LeftForeArmTwist)
    //   if(!mesh.skeleton.bones.includes(RightForeArmTwist))
    //     mesh.skeleton.bones.push(RightForeArmTwist)
    //   mesh.skeleton.calculateInverses()
    // }

    if (Root === Hips) {
      Root = null!
    }

    const targetModelBones = {
      Root,
      Hips,
      Spine,
      Spine1,
      Spine2,
      Neck,
      Head,
      LeftEye,
      RightEye,

      LeftShoulder,
      LeftArm,
      LeftForeArm,
      // LeftForeArmTwist,
      LeftHand,
      LeftUpLeg,
      LeftLeg,
      LeftFoot,

      LeftHandPinky1: leftHandBones.pinky1,
      LeftHandPinky2: leftHandBones.pinky2,
      LeftHandPinky3: leftHandBones.pinky3,
      LeftHandPinky4: leftHandBones.pinky4,
      LeftHandPinky5: leftHandBones.pinky5,
      LeftHandRing1: leftHandBones.ring1,
      LeftHandRing2: leftHandBones.ring2,
      LeftHandRing3: leftHandBones.ring3,
      LeftHandRing4: leftHandBones.ring4,
      LeftHandRing5: leftHandBones.ring5,
      LeftHandMiddle1: leftHandBones.middle1,
      LeftHandMiddle2: leftHandBones.middle2,
      LeftHandMiddle3: leftHandBones.middle3,
      LeftHandMiddle4: leftHandBones.middle4,
      LeftHandMiddle5: leftHandBones.middle5,
      LeftHandIndex1: leftHandBones.index1,
      LeftHandIndex2: leftHandBones.index2,
      LeftHandIndex3: leftHandBones.index3,
      LeftHandIndex4: leftHandBones.index4,
      LeftHandIndex5: leftHandBones.index5,
      LeftHandThumb1: leftHandBones.thumb1,
      LeftHandThumb2: leftHandBones.thumb2,
      LeftHandThumb3: leftHandBones.thumb3,
      LeftHandThumb4: leftHandBones.thumb4,

      RightShoulder,
      RightArm,
      RightForeArm,
      // RightForeArmTwist,
      RightHand,
      RightUpLeg,
      RightLeg,
      RightFoot,

      RightHandPinky1: rightHandBones.pinky1,
      RightHandPinky2: rightHandBones.pinky2,
      RightHandPinky3: rightHandBones.pinky3,
      RightHandPinky4: rightHandBones.pinky4,
      RightHandPinky5: rightHandBones.pinky5,
      RightHandRing1: rightHandBones.ring1,
      RightHandRing2: rightHandBones.ring2,
      RightHandRing3: rightHandBones.ring3,
      RightHandRing4: rightHandBones.ring4,
      RightHandRing5: rightHandBones.ring5,
      RightHandMiddle1: rightHandBones.middle1,
      RightHandMiddle2: rightHandBones.middle2,
      RightHandMiddle3: rightHandBones.middle3,
      RightHandMiddle4: rightHandBones.middle4,
      RightHandMiddle5: rightHandBones.middle5,
      RightHandIndex1: rightHandBones.index1,
      RightHandIndex2: rightHandBones.index2,
      RightHandIndex3: rightHandBones.index3,
      RightHandIndex4: rightHandBones.index4,
      RightHandIndex5: rightHandBones.index5,
      RightHandThumb1: rightHandBones.thumb1,
      RightHandThumb2: rightHandBones.thumb2,
      RightHandThumb3: rightHandBones.thumb3,
      RightHandThumb4: rightHandBones.thumb4
    }

    Object.keys(targetModelBones).forEach((key) => {
      if (!targetModelBones[key]) return
      targetModelBones[key].userData.name = targetModelBones[key].name
      targetModelBones[key].name = key
    })

    return targetModelBones as any
  } catch (error) {
    console.error(error)
    return null!
  }
}
