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

import classNames from 'classnames'
import dayjs, { Dayjs } from 'dayjs'
import React from 'react'
import { useTranslation } from 'react-i18next'

import InputSelect, { InputMenuItem } from '@etherealengine/client-core/src/common/components/InputSelect'
import InputText from '@etherealengine/client-core/src/common/components/InputText'
import { EMAIL_REGEX, PHONE_REGEX } from '@etherealengine/common/src/constants/IdConstants'
import { SendInvite } from '@etherealengine/engine/src/schemas/interfaces/Invite'
import { getMutableState, useHookstate } from '@etherealengine/hyperflux'
import Button from '@etherealengine/ui/src/primitives/mui/Button'
import Checkbox from '@etherealengine/ui/src/primitives/mui/Checkbox'
import Container from '@etherealengine/ui/src/primitives/mui/Container'
import DialogTitle from '@etherealengine/ui/src/primitives/mui/DialogTitle'
import FormControlLabel from '@etherealengine/ui/src/primitives/mui/FormControlLabel'
import FormGroup from '@etherealengine/ui/src/primitives/mui/FormGroup'
import Icon from '@etherealengine/ui/src/primitives/mui/Icon'
import IconButton from '@etherealengine/ui/src/primitives/mui/IconButton'
import Tab from '@etherealengine/ui/src/primitives/mui/Tab'
import Tabs from '@etherealengine/ui/src/primitives/mui/Tabs'

import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import { useFind } from '@etherealengine/engine/src/common/functions/FeathersHooks'
import { locationPath } from '@etherealengine/engine/src/schemas/social/location.schema'
import { userPath } from '@etherealengine/engine/src/schemas/user/user.schema'
import { NotificationService } from '../../../common/services/NotificationService'
import { InviteService } from '../../../social/services/InviteService'
import DrawerView from '../../common/DrawerView'
import { AdminSceneService, AdminSceneState } from '../../services/SceneService'
import styles from '../../styles/admin.module.scss'

interface Props {
  open: boolean
  onClose: () => void
}

const INVITE_TYPE_TAB_MAP = {
  0: 'new-user',
  1: 'location',
  2: 'instance',
  3: 'friend',
  4: 'channel'
}

const CreateInviteModal = ({ open, onClose }: Props) => {
  const { t } = useTranslation()
  const inviteTypeTab = useHookstate(0)
  const textValue = useHookstate('')
  const makeAdmin = useHookstate(false)
  const oneTimeUse = useHookstate(true)
  const locationId = useHookstate('')
  const instanceId = useHookstate('')
  const userInviteCode = useHookstate('')
  const spawnPointUUID = useHookstate('')
  const setSpawn = useHookstate(false)
  const spawnTypeTab = useHookstate(0)
  const timed = useHookstate(false)
  const startTime = useHookstate<Dayjs>(dayjs(null))
  const endTime = useHookstate<Dayjs>(dayjs(null))

  const adminInstances = useFind('instance').data
  const adminUsers = useFind(userPath, { query: { isGuest: false } }).data
  const adminLocations = useFind(locationPath).data

  const adminSceneState = useHookstate(getMutableState(AdminSceneState))
  const spawnPoints = adminSceneState.singleScene?.scene?.entities.value
    ? Object.entries(adminSceneState.singleScene.scene.entities.value).filter(([, value]) =>
        value.components.find((component) => component.name === 'spawn-point')
      )
    : []

  const handleChangeInviteTypeTab = (event: React.SyntheticEvent, newValue: number) => {
    inviteTypeTab.set(newValue)
  }

  const handleTextChange = (event: React.SyntheticEvent) => {
    textValue.set((event.target as HTMLInputElement).value)
  }

  const locationMenu: InputMenuItem[] = adminLocations.map((el) => {
    return {
      value: `${el.id}`,
      label: `${el.name} (${el.sceneId})`
    }
  })

  const instanceMenu: InputMenuItem[] = adminInstances.map((el) => {
    return {
      value: `${el.id}`,
      label: `${el.id} (${el.location.name})`
    }
  })

  const userMenu: InputMenuItem[] = adminUsers.map((el) => ({
    value: `${el.inviteCode}`,
    label: `${el.name} (${el.inviteCode})`
  }))

  const spawnPointMenu: InputMenuItem[] = spawnPoints.map(([id, value]) => {
    const transform = value.components.find((component) => component.name === 'transform')
    if (transform) {
      const position = transform.props.position
      return {
        value: `${id}`,
        label: `${id} (x: ${position.x}, y: ${position.y}, z: ${position.z})`
      }
    }
    return {
      value: `${id}`,
      label: `${id}`
    }
  })

  const handleChangeSpawnTypeTab = (event: React.SyntheticEvent, newValue: number) => {
    spawnTypeTab.set(newValue)
  }

  const handleLocationChange = (e) => {
    locationId.set(e.target.value)
    const location = adminLocations.find((location) => location.id === e.target.value)
    if (location && location.sceneId) {
      const sceneName = location.sceneId.split('/')
      AdminSceneService.fetchAdminScene(sceneName[0], sceneName[1])
    }
  }

  const handleInstanceChange = (e) => {
    instanceId.set(e.target.value)
    const instance = adminInstances.find((instance) => instance.id === e.target.value)
    if (instance) {
      const location = adminLocations.find((location) => location.id === instance.locationId)
      if (location) {
        const sceneName = location.sceneId.split('/')
        AdminSceneService.fetchAdminScene(sceneName[0], sceneName[1])
      }
    }
  }

  const handleUserChange = (e) => {
    userInviteCode.set(e.target.value)
  }

  const handleSpawnPointChange = (e) => {
    spawnPointUUID.set(e.target.value)
  }

  const submitInvites = async (event: React.SyntheticEvent) => {
    const targets = textValue.value.split(',')
    targets.map(async (target) => {
      try {
        const inviteType = INVITE_TYPE_TAB_MAP[inviteTypeTab.value]
        const isPhone = PHONE_REGEX.test(target)
        const isEmail = EMAIL_REGEX.test(target)
        const sendData = {
          inviteType: inviteType,
          token: target.length === 8 ? null : target,
          inviteCode: target.length === 8 ? target : null,
          identityProviderType: isEmail ? 'email' : isPhone ? 'sms' : null,
          targetObjectId: instanceId.value || locationId.value || null,
          makeAdmin: makeAdmin.value,
          deleteOnUse: oneTimeUse.value
        } as SendInvite
        if (setSpawn.value && spawnTypeTab.value === 0 && userInviteCode.value) {
          sendData.spawnType = 'inviteCode'
          sendData.spawnDetails = { inviteCode: userInviteCode.value }
        } else if (setSpawn.value && spawnTypeTab.value === 1 && spawnPointUUID.value) {
          sendData.spawnType = 'spawnPoint'
          sendData.spawnDetails = { spawnPoint: spawnPointUUID.value }
        }
        sendData.timed = timed.value && (startTime.value != null || endTime.value != null)
        if (sendData.timed) {
          sendData.startTime = startTime.value?.toDate()
          sendData.endTime = endTime.value?.toDate()
        }
        await InviteService.sendInvite(sendData)
        instanceId.set('')
        locationId.set('')
        textValue.set('')
        makeAdmin.set(false)
        oneTimeUse.set(true)
        userInviteCode.set('')
        setSpawn.set(false)
        spawnPointUUID.set('')
        spawnTypeTab.set(0)
        inviteTypeTab.set(0)
        timed.set(false)
        startTime.set(dayjs(null))
        endTime.set(dayjs(null))
        return
      } catch (err) {
        NotificationService.dispatchNotify(err.message, { variant: 'error' })
      }
    })
    onClose()
  }

  const disableSendButton = (): boolean => {
    return (
      textValue.value.length === 0 ||
      (inviteTypeTab.value === 1 && locationId.value.length === 0) ||
      (inviteTypeTab.value === 2 && instanceId.value.length === 0)
    )
  }

  return (
    <DrawerView open={open} onClose={onClose}>
      <Container maxWidth="sm" className={styles.mt20}>
        <DialogTitle className={styles.textAlign}>{t('admin:components.invite.create')}</DialogTitle>
        <FormGroup>
          <Tabs
            value={inviteTypeTab.value}
            className={styles.marginBottom10px}
            onChange={handleChangeInviteTypeTab}
            aria-label="Invite Type"
            classes={{ root: styles.tabRoot, indicator: styles.selected }}
          >
            <Tab
              className={inviteTypeTab.value === 0 ? styles.selectedTab : styles.unselectedTab}
              label={INVITE_TYPE_TAB_MAP[0].replace('-', ' ')}
              classes={{ root: styles.tabRoot }}
            />
            <Tab
              className={inviteTypeTab.value === 1 ? styles.selectedTab : styles.unselectedTab}
              label={INVITE_TYPE_TAB_MAP[1].replace('-', ' ')}
            />
            <Tab
              className={inviteTypeTab.value === 2 ? styles.selectedTab : styles.unselectedTab}
              label={INVITE_TYPE_TAB_MAP[2].replace('-', ' ')}
            />
          </Tabs>
          <div className={styles.inputContainer}>
            <InputText
              name="urlSelect"
              label={t('admin:components.invite.targetLabel')}
              placeholder={t('admin:components.invite.target')}
              value={textValue.value}
              onChange={handleTextChange}
            />
          </div>
          <FormControlLabel
            control={
              <Checkbox
                checked={oneTimeUse.value}
                onChange={() => {
                  oneTimeUse.set(!oneTimeUse.value)
                }}
              />
            }
            label="One-time use"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={timed.value}
                onChange={() => {
                  timed.set(!timed.value)
                }}
              />
            }
            label="Timed invite"
          />
          {timed.value && (
            <div className={styles.datePickerContainer}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className={styles.pickerControls}>
                  <DateTimePicker
                    label="Start Time"
                    value={startTime.value}
                    onChange={(e) => startTime.set(dayjs(e))}
                  />
                  <IconButton
                    color="primary"
                    size="small"
                    className={styles.clearTime}
                    onClick={() => startTime.set(dayjs(null))}
                    icon={<Icon type="HighlightOff" />}
                  />
                </div>
                <div className={styles.pickerControls}>
                  <DateTimePicker label="End Time" value={endTime.value} onChange={(e) => endTime.set(dayjs(e))} />
                  <IconButton
                    color="primary"
                    size="small"
                    className={styles.clearTime}
                    onClick={() => endTime.set(dayjs(null))}
                    icon={<Icon type="HighlightOff" />}
                  />
                </div>
              </LocalizationProvider>
            </div>
          )}
          {inviteTypeTab.value === 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={makeAdmin.value}
                  onChange={() => {
                    makeAdmin.set(!makeAdmin.value)
                  }}
                />
              }
              label="Make user admin"
            />
          )}
          {(inviteTypeTab.value === 1 || inviteTypeTab.value === 2) && (
            <div className={styles.marginBottom10px}>
              {inviteTypeTab.value === 1 && (
                <InputSelect
                  name="location"
                  className={classNames({
                    [styles.maxWidth90]: true,
                    [styles.inputField]: true
                  })}
                  label={t('admin:components.invite.location')}
                  value={locationId.value}
                  menu={locationMenu}
                  disabled={false}
                  onChange={handleLocationChange}
                />
              )}
              {inviteTypeTab.value === 2 && (
                <InputSelect
                  name="instance"
                  className={classNames({
                    [styles.maxWidth90]: true,
                    [styles.inputField]: true
                  })}
                  label={t('admin:components.invite.instance')}
                  value={instanceId.value}
                  menu={instanceMenu}
                  disabled={false}
                  onChange={handleInstanceChange}
                />
              )}
              {((inviteTypeTab.value === 1 && locationId.value) || (inviteTypeTab.value === 2 && instanceId.value)) && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setSpawn.value}
                      onChange={() => {
                        setSpawn.set(!setSpawn.value)
                      }}
                    />
                  }
                  label="Spawn at position"
                />
              )}
              {setSpawn.value && (
                <Tabs
                  value={spawnTypeTab.value}
                  className={styles.marginBottom10px}
                  onChange={handleChangeSpawnTypeTab}
                  aria-label="Spawn position"
                  classes={{ root: styles.tabRoot, indicator: styles.selected }}
                >
                  <Tab
                    className={spawnTypeTab.value === 0 ? styles.selectedTab : styles.unselectedTab}
                    label="User position"
                    classes={{ root: styles.tabRoot }}
                  />
                  <Tab
                    className={spawnTypeTab.value === 1 ? styles.selectedTab : styles.unselectedTab}
                    label={'Spawn Point'}
                  />
                </Tabs>
              )}
              {setSpawn.value && spawnTypeTab.value === 0 && (
                <InputSelect
                  name="user"
                  className={classNames({
                    [styles.maxWidth90]: true,
                    [styles.inputField]: true
                  })}
                  label={t('admin:components.invite.user')}
                  value={userInviteCode.value}
                  menu={userMenu}
                  disabled={false}
                  onChange={handleUserChange}
                />
              )}
              {setSpawn.value && spawnTypeTab.value === 1 && (
                <InputSelect
                  name="spawnPoint"
                  className={classNames({
                    [styles.maxWidth90]: true,
                    [styles.inputField]: true
                  })}
                  label={t('admin:components.invite.spawnPoint')}
                  value={spawnPointUUID.value}
                  menu={spawnPointMenu}
                  disabled={false}
                  onChange={handleSpawnPointChange}
                />
              )}
            </div>
          )}
          <Button
            className={styles.submitButton}
            type="button"
            variant="contained"
            color="primary"
            disabled={disableSendButton()}
            onClick={submitInvites}
          >
            {t('admin:components.invite.submit')}
          </Button>
        </FormGroup>
      </Container>
    </DrawerView>
  )
}

export default CreateInviteModal
