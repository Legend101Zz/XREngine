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

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { getMutableState, useHookstate } from '@etherealengine/hyperflux'
import Button from '@etherealengine/ui/src/primitives/mui/Button'
import Container from '@etherealengine/ui/src/primitives/mui/Container'

import { AuthService, AuthState } from '../../services/AuthService'
import styles from './styles.module.scss'

const DiscordCallbackComponent = (props): JSX.Element => {
  const { t } = useTranslation()
  const initialState = { error: '', token: '' }
  const [state, setState] = useState(initialState)
  const search = new URLSearchParams(useLocation().search)

  useEffect(() => {
    const error = search.get('error') as string
    const token = search.get('token') as string
    const type = search.get('type') as string
    const path = search.get('path') as string
    const instanceId = search.get('instanceId') as string

    if (!error) {
      if (type === 'connection') {
        const user = useHookstate(getMutableState(AuthState)).user
        AuthService.refreshConnections(user.id.value!)
      } else {
        let redirectSuccess = `${path}`
        if (instanceId != null) redirectSuccess += `?instanceId=${instanceId}`
        AuthService.loginUserByJwt(token, redirectSuccess || '/', '/')
      }
    }

    setState({ ...state, error, token })
  }, [])

  function redirectToRoot() {
    window.location.href = '/'
  }

  return state.error && state.error !== '' ? (
    <Container className={styles.oauthError}>
      <div className={styles.title}>{t('user:oauth.authFailed', { service: 'Discord' })}</div>
      <div className={styles.message}>{state.error}</div>
      <Button onClick={redirectToRoot} className={styles.gradientButton}>
        {t('user:oauth.redirectToRoot')}
      </Button>
    </Container>
  ) : (
    <Container>{t('user:oauth.authenticating')}</Container>
  )
}

export const DiscordCallback = DiscordCallbackComponent as any
