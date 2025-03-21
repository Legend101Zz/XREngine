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
import { Quaternion, Vector3 } from 'three'

import { isDev } from '@etherealengine/common/src/config'
import { V_001, V_010, V_111 } from '@etherealengine/engine/src/common/constants/MathConstants'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'
import {
  addComponent,
  defineQuery,
  getComponent,
  hasComponent,
  removeComponent
} from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { removeEntity } from '@etherealengine/engine/src/ecs/functions/EntityFunctions'
import { defineSystem } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'
import { InputSourceComponent } from '@etherealengine/engine/src/input/components/InputSourceComponent'
import { XRStandardGamepadButton } from '@etherealengine/engine/src/input/state/ButtonState'
import { NameComponent } from '@etherealengine/engine/src/scene/components/NameComponent'
import { setVisibleComponent, VisibleComponent } from '@etherealengine/engine/src/scene/components/VisibleComponent'
import {
  ComputedTransformComponent,
  setComputedTransformComponent
} from '@etherealengine/engine/src/transform/components/ComputedTransformComponent'
import {
  LocalTransformComponent,
  setLocalTransformComponent,
  TransformComponent
} from '@etherealengine/engine/src/transform/components/TransformComponent'
import { isMobileXRHeadset, ReferenceSpace } from '@etherealengine/engine/src/xr/XRState'
import { ObjectFitFunctions } from '@etherealengine/engine/src/xrui/functions/ObjectFitFunctions'
import {
  RegisteredWidgets,
  WidgetAppActions,
  WidgetAppServiceReceptorSystem,
  WidgetAppState
} from '@etherealengine/engine/src/xrui/WidgetAppService'
import { defineActionQueue, defineState, dispatchAction, getState } from '@etherealengine/hyperflux'

import { createAnchorWidget } from './createAnchorWidget'
// import { createHeightAdjustmentWidget } from './createHeightAdjustmentWidget'
// import { createMediaWidget } from './createMediaWidget'
import { createRecordingsWidget } from './createRecordingsWidget'
import { createWidgetButtonsView } from './ui/WidgetMenuView'

const widgetLeftMenuGripOffset = new Vector3(0.08, 0, -0.05)
const widgetRightMenuGripOffset = new Vector3(-0.08, 0, -0.05)
const vec3 = new Vector3()

const widgetLeftRotation = new Quaternion()
  .setFromAxisAngle(V_010, Math.PI * 0.5)
  .multiply(new Quaternion().setFromAxisAngle(V_001, -Math.PI * 0.5))

const widgetRightRotation = new Quaternion()
  .setFromAxisAngle(V_010, -Math.PI * 0.5)
  .multiply(new Quaternion().setFromAxisAngle(V_001, Math.PI * 0.5))

const WidgetUISystemState = defineState({
  name: 'WidgetUISystemState',
  initial: () => {
    const widgetMenuUI = createWidgetButtonsView()
    removeComponent(widgetMenuUI.entity, VisibleComponent)

    addComponent(widgetMenuUI.entity, NameComponent, 'widget_menu')
    // const helper = new AxesHelper(0.1)
    // setObjectLayers(helper, ObjectLayers.Gizmos)
    // addObjectToGroup(widgetMenuUI.entity, helper)

    return {
      widgetMenuUI
    }
  }
})

const createWidgetMenus = () => {
  createAnchorWidget()
  createRecordingsWidget()
  // createHeightAdjustmentWidget
  // createMediaWidget
}

const toggleWidgetsMenu = (handedness: 'left' | 'right' = getState(WidgetAppState).handedness) => {
  const widgetState = getState(WidgetAppState)
  const state = widgetState.widgets
  const openWidget = Object.entries(state).find(([id, widget]) => widget.visible)
  if (openWidget) {
    dispatchAction(WidgetAppActions.showWidget({ id: openWidget[0], shown: false }))
    dispatchAction(WidgetAppActions.showWidgetMenu({ shown: true, handedness }))
  } else {
    if (widgetState.handedness !== handedness) {
      dispatchAction(WidgetAppActions.showWidgetMenu({ shown: true, handedness }))
    } else {
      dispatchAction(WidgetAppActions.showWidgetMenu({ shown: !widgetState.widgetsMenuOpen, handedness }))
    }
  }
}

const inputSourceQuery = defineQuery([InputSourceComponent])

const showWidgetQueue = defineActionQueue(WidgetAppActions.showWidget.matches)
const registerWidgetQueue = defineActionQueue(WidgetAppActions.registerWidget.matches)
const unregisterWidgetQueue = defineActionQueue(WidgetAppActions.unregisterWidget.matches)

const execute = () => {
  const widgetState = getState(WidgetAppState)
  const { widgetMenuUI } = getState(WidgetUISystemState)
  const inputSources = inputSourceQuery()

  for (const inputSourceEntity of inputSources) {
    const inputSource = getComponent(inputSourceEntity, InputSourceComponent)
    const keys = inputSource.buttons
    if (inputSource.source.gamepad?.mapping === 'xr-standard') {
      if (keys[XRStandardGamepadButton.ButtonA]?.down)
        toggleWidgetsMenu(inputSource.source.handedness === 'left' ? 'right' : 'left')
    }
    /** @todo allow non HMDs to access the widget menu too */
    if ((isDev || isMobileXRHeadset) && keys.Escape?.down) toggleWidgetsMenu()
  }

  for (const action of showWidgetQueue()) {
    const widget = RegisteredWidgets.get(action.id)!
    setVisibleComponent(widget.ui.entity, action.shown)
    if (action.shown) {
      if (typeof widget.onOpen === 'function') widget.onOpen()
    } else if (typeof widget.onClose === 'function') widget.onClose()
  }
  for (const action of registerWidgetQueue()) {
    const widget = RegisteredWidgets.get(action.id)!
    setLocalTransformComponent(widget.ui.entity, widgetMenuUI.entity)
  }
  for (const action of unregisterWidgetQueue()) {
    const widget = RegisteredWidgets.get(action.id)!
    removeComponent(widget.ui.entity, LocalTransformComponent)
    if (typeof widget.cleanup === 'function') widget.cleanup()
  }

  const transform = getComponent(widgetMenuUI.entity, TransformComponent)
  const activeInputSourceEntity = inputSources.find(
    (entity) => getComponent(entity, InputSourceComponent).source.handedness === widgetState.handedness
  )

  if (activeInputSourceEntity) {
    const activeInputSource = getComponent(activeInputSourceEntity, InputSourceComponent)?.source
    const referenceSpace = ReferenceSpace.origin!
    const pose = Engine.instance.xrFrame!.getPose(
      activeInputSource.gripSpace ?? activeInputSource.targetRaySpace,
      referenceSpace
    )
    if (hasComponent(widgetMenuUI.entity, ComputedTransformComponent)) {
      removeComponent(widgetMenuUI.entity, ComputedTransformComponent)
      transform.scale.copy(V_111)
    }
    if (pose) {
      const rot = widgetState.handedness === 'left' ? widgetLeftRotation : widgetRightRotation
      const offset = widgetState.handedness === 'left' ? widgetLeftMenuGripOffset : widgetRightMenuGripOffset
      const orientation = pose.transform.orientation as any as Quaternion
      transform.rotation.copy(orientation).multiply(rot)
      vec3.copy(offset).applyQuaternion(orientation)
      transform.position.copy(pose.transform.position as any as Vector3).add(vec3)
    }
  } else {
    if (!hasComponent(widgetMenuUI.entity, ComputedTransformComponent))
      setComputedTransformComponent(widgetMenuUI.entity, Engine.instance.cameraEntity, () =>
        ObjectFitFunctions.attachObjectInFrontOfCamera(widgetMenuUI.entity, 0.2, 0.1)
      )
  }

  const widgetMenuShown = widgetState.widgetsMenuOpen
  setVisibleComponent(widgetMenuUI.entity, widgetMenuShown)

  for (const [id, widget] of RegisteredWidgets) {
    if (!widgetState.widgets[id]) continue
    const widgetEnabled = widgetState.widgets[id].enabled
    if (widgetEnabled && typeof widget.system === 'function') {
      widget.system()
    }
  }
}

const reactor = () => {
  useEffect(() => {
    createWidgetMenus()
    return () => {
      const { widgetMenuUI } = getState(WidgetUISystemState)
      removeEntity(widgetMenuUI.entity)
    }
  }, [])
  return null
}

export const WidgetUISystem = defineSystem({
  uuid: 'ee.client.WidgetUISystem',
  execute,
  reactor,
  preSystems: [WidgetAppServiceReceptorSystem]
})
