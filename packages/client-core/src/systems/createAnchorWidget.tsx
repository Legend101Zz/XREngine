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

import { removeComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { VisibleComponent } from '@etherealengine/engine/src/scene/components/VisibleComponent'
import { ReferenceSpace, XRAction, XRState } from '@etherealengine/engine/src/xr/XRState'
import { createXRUI } from '@etherealengine/engine/src/xrui/functions/createXRUI'
import { WidgetAppActions, WidgetAppState } from '@etherealengine/engine/src/xrui/WidgetAppService'
import { Widget, Widgets } from '@etherealengine/engine/src/xrui/Widgets'
import { defineActionQueue, dispatchAction, getMutableState, removeActionQueue } from '@etherealengine/hyperflux'

import { AnchorWidgetUI } from './ui/AnchorWidgetUI'

export function createAnchorWidget() {
  const ui = createXRUI(AnchorWidgetUI)
  removeComponent(ui.entity, VisibleComponent)
  const xrState = getMutableState(XRState)
  // const avatarInputSettings = getMutableState(AvatarInputSettingsState)

  const widgetMutableState = getMutableState(WidgetAppState)

  const xrSessionQueue = defineActionQueue(XRAction.sessionChanged.matches)

  const widget: Widget = {
    ui,
    label: 'World Anchor',
    icon: 'Anchor',
    onOpen: () => {
      const xrSession = xrState.session.value
      if (!xrSession || !ReferenceSpace.viewer) return
      xrState.scenePlacementMode.set('placing')
    },
    system: () => {
      for (const action of xrSessionQueue()) {
        const widgetEnabled = xrState.sessionMode.value === 'immersive-ar'
        if (widgetMutableState.widgets[id].enabled.value !== widgetEnabled)
          dispatchAction(WidgetAppActions.enableWidget({ id, enabled: widgetEnabled }))
      }
      if (!xrState.scenePlacementMode.value) return
      // const flipped = avatarInputSettings.preferredHand.value === 'left'
      // const buttonInput = flipped ? Engine.instance.buttons.ButtonX?.down : Engine.instance.buttons.ButtonA?.down
      // if (buttonInput) {
      //   createAnchor().then((anchor: XRAnchor) => {
      //     setComponent(entity, XRAnchorComponent, { anchor })
      //   })
      //   removeComponent(xrState.scenePlacementEntity.value, XRHitTestComponent)
      // }
    },
    cleanup: async () => {
      removeActionQueue(xrSessionQueue)
    }
  }

  const id = Widgets.registerWidget(ui.entity, widget)
  /** @todo better API to disable */
  dispatchAction(WidgetAppActions.enableWidget({ id, enabled: false }))
}
