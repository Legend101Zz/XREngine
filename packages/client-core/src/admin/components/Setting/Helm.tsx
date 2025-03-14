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

import React from 'react'
import { useTranslation } from 'react-i18next'

import { useHookstate } from '@etherealengine/hyperflux'
import Box from '@etherealengine/ui/src/primitives/mui/Box'
import Button from '@etherealengine/ui/src/primitives/mui/Button'
import Grid from '@etherealengine/ui/src/primitives/mui/Grid'
import Typography from '@etherealengine/ui/src/primitives/mui/Typography'

import { useFind, useMutation } from '@etherealengine/engine/src/common/functions/FeathersHooks'
import { helmSettingPath } from '@etherealengine/engine/src/schemas/setting/helm-setting.schema'
import InputSelect, { InputMenuItem } from '../../../common/components/InputSelect'
import styles from '../../styles/settings.module.scss'

const Helm = () => {
  const { t } = useTranslation()

  const helmSetting = useFind(helmSettingPath).data.at(0)
  const id = helmSetting?.id

  const helmMainVersions = useFind('helm-main-version').data
  const helmBuilderVersions = useFind('helm-builder-version').data

  const selectedMainVersion = useHookstate(helmSetting?.main)
  const selectedBuilderVersion = useHookstate(helmSetting?.builder)

  const patchHelmSetting = useMutation(helmSettingPath).patch

  const handleMainVersionChange = async (e) => {
    console.log('changeMainVersion', e, e.target.value)
    selectedMainVersion.set(e.target.value)
  }
  const handleBuilderVersionChange = async (e) => {
    selectedBuilderVersion.set(e.target.value)
  }

  const mainVersionMenu: InputMenuItem[] = helmMainVersions.map((el) => {
    return {
      value: el as string,
      label: el
    }
  })

  const builderVersionMenu: InputMenuItem[] = helmBuilderVersions.map((el) => {
    return {
      value: el as string,
      label: el
    }
  })

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!id || !selectedMainVersion.value || !selectedBuilderVersion.value) return

    patchHelmSetting(id, { main: selectedMainVersion.value, builder: selectedBuilderVersion.value })
  }

  const handleCancel = () => {
    selectedMainVersion.set(helmSetting?.main)
    selectedBuilderVersion.set(helmSetting?.builder)
  }

  return (
    <Box>
      <Typography component="h1" className={styles.settingsHeading}>
        {t('admin:components.setting.helm.header')}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={6} sm={6}>
          <InputSelect
            name="helmMain"
            label={t('admin:components.setting.helm.main')}
            value={selectedMainVersion.value}
            menu={mainVersionMenu}
            onChange={handleMainVersionChange}
          />
        </Grid>
        <Grid item xs={6} sm={6}>
          <InputSelect
            name="helmBuilder"
            label={t('admin:components.setting.helm.builder')}
            value={selectedBuilderVersion.value}
            menu={builderVersionMenu}
            onChange={handleBuilderVersionChange}
          />
        </Grid>
      </Grid>

      <Typography component="h1" className={styles.settingsSubheading}>
        {t('admin:components.setting.helm.explainer')}
      </Typography>

      <Button sx={{ maxWidth: '100%' }} className={styles.outlinedButton} onClick={handleCancel}>
        {t('admin:components.common.cancel')}
      </Button>
      <Button sx={{ maxWidth: '100%', ml: 1 }} className={styles.gradientButton} onClick={handleSubmit}>
        {t('admin:components.common.save')}
      </Button>
    </Box>
  )
}

export default Helm
