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

import { DataChannelType } from '@etherealengine/common/src/interfaces/DataChannelType'
import { defineSystem } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'
import { NetworkState } from '@etherealengine/engine/src/networking/NetworkState'
import { NetworkTopics } from '@etherealengine/engine/src/networking/classes/Network'
import {
  DataChannelRegistryState,
  DataConsumerActions
} from '@etherealengine/engine/src/networking/systems/DataProducerConsumerState'
import { UserID } from '@etherealengine/engine/src/schemas/user/user.schema'
import { defineActionQueue, getMutableState, getState } from '@etherealengine/hyperflux'
import { State, useHookstate } from '@hookstate/core'
import React, { useEffect } from 'react'
import {
  SocketWebRTCClientNetwork,
  createDataConsumer,
  createDataProducer
} from '../transports/SocketWebRTCClientFunctions'

export const consumerData = async (action: typeof DataConsumerActions.consumerCreated.matches._TYPE) => {
  const network = getState(NetworkState).networks[action.$network] as SocketWebRTCClientNetwork

  const dataConsumer = await network.recvTransport.consumeData({
    id: action.consumerID,
    sctpStreamParameters: action.sctpStreamParameters,
    label: action.dataChannel,
    protocol: action.protocol,
    appData: action.appData,
    // this is unused, but for whatever reason mediasoup will throw an error if it's not defined
    dataProducerId: ''
  })

  // Firefox uses blob as by default hence have to convert binary type of data consumer to 'arraybuffer' explicitly.
  dataConsumer.binaryType = 'arraybuffer'
  dataConsumer.on('message', (message: any) => {
    try {
      const dataChannelFunctions = getState(DataChannelRegistryState)[dataConsumer.label as DataChannelType]
      if (dataChannelFunctions) {
        for (const func of dataChannelFunctions)
          func(network, dataConsumer.label as DataChannelType, network.hostPeerID, message) // assmume for now data is coming from the host
      }
    } catch (e) {
      console.error(e)
    }
  }) // Handle message received
  dataConsumer.on('close', () => {
    dataConsumer.close()
  })

  network.dataConsumers.set(action.dataChannel, dataConsumer)
}

const dataConsumerCreatedActionQueue = defineActionQueue(DataConsumerActions.consumerCreated.matches)

const execute = () => {
  for (const action of dataConsumerCreatedActionQueue()) {
    consumerData(action)
  }
}

export const DataChannel = (props: { networkID: UserID; dataChannelType: DataChannelType }) => {
  const { networkID, dataChannelType } = props
  const networkState = getMutableState(NetworkState).networks[props.networkID] as State<SocketWebRTCClientNetwork>
  const recvTransport = useHookstate(networkState.recvTransport)
  const sendTransport = useHookstate(networkState.sendTransport)

  useEffect(() => {
    if (!recvTransport.value || !sendTransport.value) return

    const network = getState(NetworkState).networks[networkID] as SocketWebRTCClientNetwork
    createDataProducer(network, dataChannelType)
    createDataConsumer(network, dataChannelType)

    return () => {
      // todo - cleanup
    }
  }, [recvTransport, sendTransport])

  return null
}

const NetworkReactor = (props: { networkID: UserID }) => {
  const { networkID } = props
  const dataChannelRegistry = useHookstate(getMutableState(DataChannelRegistryState))
  return (
    <>
      {dataChannelRegistry.keys.map((dataChannelType) => (
        <DataChannel key={dataChannelType} networkID={networkID} dataChannelType={dataChannelType as DataChannelType} />
      ))}
    </>
  )
}

export const DataChannels = () => {
  const networkIDs = Object.entries(useHookstate(getMutableState(NetworkState).networks).value)
    .filter(([networkID, network]) => network.topic === NetworkTopics.world)
    .map(([networkID, network]) => networkID)
  return (
    <>
      {networkIDs.map((hostId: UserID) => (
        <NetworkReactor key={hostId} networkID={hostId} />
      ))}
    </>
  )
}

export const DataChannelSystem = defineSystem({
  uuid: 'ee.client.DataChannelSystem',
  execute,
  reactor: DataChannels
})
