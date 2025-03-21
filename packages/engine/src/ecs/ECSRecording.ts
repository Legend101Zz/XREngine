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

import { UserID } from '@etherealengine/engine/src/schemas/user/user.schema'
import { defineAction, dispatchAction } from '@etherealengine/hyperflux'

import { Validator, matches, matchesUserId } from '../common/functions/MatchesUtils'
import { NetworkTopics } from '../networking/classes/Network'

import { RecordingID } from '../schemas/recording/recording.schema'
import { Engine } from './classes/Engine'

export const startRecording = (args: { recordingID: RecordingID }) => {
  const { recordingID } = args
  const action = ECSRecordingActions.startRecording({
    recordingID
  })

  dispatchAction({
    ...action,
    $topic: NetworkTopics.world,
    $to: Engine.instance.worldNetwork.hostPeerID
  })

  dispatchAction({
    ...action,
    $topic: NetworkTopics.media,
    $to: Engine.instance.mediaNetwork.hostPeerID
  })
}

export const stopRecording = (args: { recordingID: RecordingID }) => {
  const recording = ECSRecordingActions.stopRecording({
    recordingID: args.recordingID
  })
  dispatchAction({
    ...recording,
    $topic: NetworkTopics.world,
    $to: Engine.instance.worldNetwork.hostPeerID
  })
  // todo - check that video actually needs to be stopped
  dispatchAction({
    ...recording,
    $topic: NetworkTopics.media,
    $to: Engine.instance.mediaNetwork.hostPeerID
  })
}

export const startPlayback = (args: { recordingID: RecordingID; targetUser?: UserID }) => {
  const { recordingID, targetUser } = args
  const action = ECSRecordingActions.startPlayback({
    recordingID,
    targetUser
  })

  dispatchAction({
    ...action,
    $topic: NetworkTopics.world,
    $to: Engine.instance.worldNetwork.hostPeerID
  })

  dispatchAction({
    ...action,
    $topic: NetworkTopics.media,
    $to: Engine.instance.mediaNetwork.hostPeerID
  })
}

export const stopPlayback = (args: { recordingID: RecordingID }) => {
  const { recordingID } = args
  const action = ECSRecordingActions.stopPlayback({
    recordingID
  })

  dispatchAction({
    ...action,
    $topic: NetworkTopics.world,
    $to: Engine.instance.worldNetwork.hostPeerID
  })

  dispatchAction({
    ...action,
    $topic: NetworkTopics.media,
    $to: Engine.instance.mediaNetwork.hostPeerID
  })
}

export const ECSRecordingFunctions = {
  startRecording,
  stopRecording,
  startPlayback,
  stopPlayback
}

export class ECSRecordingActions {
  static startRecording = defineAction({
    type: 'ee.core.motioncapture.START_RECORDING' as const,
    recordingID: matches.string as Validator<unknown, RecordingID>
  })

  static recordingStarted = defineAction({
    type: 'ee.core.motioncapture.RECORDING_STARTED' as const,
    recordingID: matches.string as Validator<unknown, RecordingID>
  })

  static stopRecording = defineAction({
    type: 'ee.core.motioncapture.STOP_RECORDING' as const,
    recordingID: matches.string as Validator<unknown, RecordingID>
  })

  static startPlayback = defineAction({
    type: 'ee.core.motioncapture.PLAY_RECORDING' as const,
    recordingID: matches.string as Validator<unknown, RecordingID>,
    targetUser: matchesUserId.optional()
  })

  static playbackChanged = defineAction({
    type: 'ee.core.motioncapture.PLAYBACK_CHANGED' as const,
    recordingID: matches.string as Validator<unknown, RecordingID>,
    playing: matches.boolean
  })

  static stopPlayback = defineAction({
    type: 'ee.core.motioncapture.STOP_PLAYBACK' as const,
    recordingID: matches.string as Validator<unknown, RecordingID>
  })

  static error = defineAction({
    type: 'ee.core.motioncapture.ERROR' as const,
    error: matches.string
  })
}
