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

import React, { useEffect } from 'react'

import { PeerID } from '@etherealengine/common/src/interfaces/PeerID'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'
import {
  NetworkState,
  screenshareAudioDataChannelType,
  screenshareVideoDataChannelType,
  webcamAudioDataChannelType
} from '@etherealengine/engine/src/networking/NetworkState'
import { getMutableState, getState, State, useHookstate } from '@etherealengine/hyperflux'

import { MediaProducerConsumerState } from '@etherealengine/engine/src/networking/systems/MediaProducerConsumerState'
import { UserID } from '@etherealengine/engine/src/schemas/user/user.schema'
import { useMediaNetwork } from '../common/services/MediaInstanceConnectionService'
import { MediaStreamState } from '../transports/MediaStreams'
import {
  createPeerMediaChannels,
  PeerMediaChannelState,
  removePeerMediaChannels
} from '../transports/PeerMediaChannelState'
import { SocketWebRTCClientNetwork } from '../transports/SocketWebRTCClientFunctions'

/**
 * Sets media stream state for a peer
 */
const PeerMedia = (props: { consumerID: string; networkID: UserID }) => {
  const consumerState = useHookstate(
    getMutableState(MediaProducerConsumerState)[props.networkID].consumers[props.consumerID]
  )
  const producerID = consumerState.producerID.value
  const producerState = useHookstate(getMutableState(MediaProducerConsumerState)[props.networkID].producers[producerID])

  const peerID = consumerState.peerID.value
  const mediaTag = consumerState.mediaTag.value

  const type =
    mediaTag === screenshareAudioDataChannelType || mediaTag === screenshareVideoDataChannelType ? 'screen' : 'cam'
  const isAudio = mediaTag === webcamAudioDataChannelType || mediaTag === screenshareAudioDataChannelType

  const networkState = useHookstate(
    getMutableState(NetworkState).networks[props.networkID]
  ) as State<SocketWebRTCClientNetwork>

  const consumer = networkState.consumers.find((c) => c.value.id === props.consumerID)

  useEffect(() => {
    if (!consumer) return
    const peerMediaChannelState = getMutableState(PeerMediaChannelState)[peerID]?.[type]
    if (!peerMediaChannelState) return
    if (isAudio) {
      peerMediaChannelState.audioStream.set(consumer.value)
    } else {
      peerMediaChannelState.videoStream.set(consumer.value)
    }
  }, [consumer])

  useEffect(() => {
    const peerMediaChannelState = getMutableState(PeerMediaChannelState)[peerID]?.[type]
    if (!peerMediaChannelState) return
    if (isAudio) peerMediaChannelState.audioStreamPaused.set(!!consumerState.paused.value)
    else peerMediaChannelState.videoStreamPaused.set(!!consumerState.paused.value)
  }, [consumerState.paused])

  useEffect(() => {
    const globalMute = !!producerState.globalMute?.value
    const paused = !!producerState.paused?.value

    const peerMediaChannelState = getMutableState(PeerMediaChannelState)[peerID]?.[type]
    if (!peerMediaChannelState) return

    if (isAudio) {
      peerMediaChannelState.audioProducerPaused.set(paused)
      peerMediaChannelState.audioProducerGlobalMute.set(globalMute)
    } else {
      peerMediaChannelState.videoProducerPaused.set(paused)
      peerMediaChannelState.videoProducerGlobalMute.set(globalMute)
    }
  }, [producerState.paused])

  return null
}

const SelfMedia = () => {
  const mediaStreamState = useHookstate(getMutableState(MediaStreamState))

  const peerMediaChannelState = useHookstate(getMutableState(PeerMediaChannelState)[Engine.instance.peerID])

  useEffect(() => {
    peerMediaChannelState.cam.audioStream.set(mediaStreamState.camAudioProducer.value)
  }, [mediaStreamState.camAudioProducer])

  useEffect(() => {
    peerMediaChannelState.cam.videoStream.set(mediaStreamState.camVideoProducer.value)
  }, [mediaStreamState.camVideoProducer])

  useEffect(() => {
    peerMediaChannelState.screen.audioStream.set(mediaStreamState.screenAudioProducer.value)
  }, [mediaStreamState.screenAudioProducer])

  useEffect(() => {
    peerMediaChannelState.screen.videoStream.set(mediaStreamState.screenVideoProducer.value)
  }, [mediaStreamState.screenVideoProducer])

  return null
}

export const PeerMediaChannels = () => {
  const mediaStreamState = useHookstate(getMutableState(MediaStreamState))
  const mediaNetworkState = useMediaNetwork()

  // create a peer media stream for each peer with a consumer
  useEffect(() => {
    const mediaNetwork = Engine.instance.mediaNetwork as SocketWebRTCClientNetwork
    if (!mediaNetwork) return
    const peerMediaChannels = getState(PeerMediaChannelState)
    const mediaChannelPeers = Array.from(mediaNetwork.peers.keys()).filter((peerID) => peerID !== 'server')
    for (const peerID of mediaChannelPeers) {
      if (!peerMediaChannels[peerID]) {
        createPeerMediaChannels(peerID)
      }
    }
    for (const peerID of Object.keys(peerMediaChannels)) {
      const peerConsumers = mediaChannelPeers.filter((peer) => peer === peerID)
      if (peerConsumers.length === 0) {
        removePeerMediaChannels(peerID as PeerID)
      }
    }
  }, [
    mediaNetworkState?.peers?.size,
    mediaNetworkState?.consumers?.length,
    mediaStreamState.videoStream,
    mediaStreamState.audioStream,
    mediaStreamState.screenAudioProducer,
    mediaStreamState.screenVideoProducer
  ])

  return null
}

const NetworkConsumers = (props: { networkID: UserID }) => {
  const { networkID } = props
  const consumers = useHookstate(getMutableState(MediaProducerConsumerState)[networkID].consumers)
  return (
    <>
      {consumers.keys.map((consumerID: string) => (
        <PeerMedia key={consumerID} consumerID={consumerID} networkID={networkID} />
      ))}
    </>
  )
}

export const PeerMediaConsumers = () => {
  const networkIDs = useHookstate(getMutableState(MediaProducerConsumerState))
  const selfPeerMediaChannelState = useHookstate(getMutableState(PeerMediaChannelState)[Engine.instance.peerID])
  return (
    <>
      <PeerMediaChannels key={'PeerMediaChannels'} />
      {selfPeerMediaChannelState.value && <SelfMedia key={'SelfMedia'} />}
      {networkIDs.keys.map((hostId: UserID) => (
        <NetworkConsumers key={hostId} networkID={hostId} />
      ))}
    </>
  )
}
