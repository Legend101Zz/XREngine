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

// See http://docs.sequelizejs.com/en/latest/docs/models-definition/
// for more of what you can do here.
import { DataTypes, Model, Sequelize } from 'sequelize'

import { InviteInterface, InviteTypeInterface } from '@etherealengine/common/src/dbmodels/Invite'

import { Application } from '../../../declarations'
import { createUserModel } from '../../all.model'

export default (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const invite = sequelizeClient.define<Model<InviteInterface>>(
    'invite',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV1,
        allowNull: false,
        primaryKey: true
      },
      token: {
        type: DataTypes.STRING
      },
      identityProviderType: {
        type: DataTypes.STRING
      },
      passcode: {
        type: DataTypes.STRING,
        allowNull: false
      },
      targetObjectId: {
        type: DataTypes.STRING
      },
      deleteOnUse: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      makeAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      spawnType: {
        type: DataTypes.STRING
      },
      spawnDetails: {
        type: DataTypes.JSON
      },
      timed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      startTime: {
        type: DataTypes.DATE
      },
      endTime: {
        type: DataTypes.DATE
      }
    },
    {
      hooks: {
        beforeCount(options: any): void {
          options.raw = true
        }
      }
    }
  )

  // eslint-disable-next-line no-unused-vars
  ;(invite as any).associate = (models: any): void => {
    ;(invite as any).belongsTo(createUserModel(app), { as: 'user' })
    ;(invite as any).belongsTo(createUserModel(app), { as: 'invitee' })
    ;(invite as any).belongsTo(createInviteTypeModel(app), { foreignKey: 'inviteType', required: true })
    // Define associations here
    // See http://docs.sequelizejs.com/en/latest/docs/associations/
  }

  return invite
}

export const createInviteTypeModel = (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const inviteType = sequelizeClient.define<Model<InviteTypeInterface>>(
    'invite-type',
    {
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        unique: true
      }
    },
    {
      hooks: {
        beforeCount(options: any): void {
          options.raw = true
        },
        beforeUpdate(instance: any, options: any): void {
          throw new Error("Can't update a type!")
        }
      },
      timestamps: false
    }
  )

  // eslint-disable-next-line no-unused-vars
  ;(inviteType as any).associate = (models: any): void => {
    // Define associations here
    // See http://docs.sequelizejs.com/en/latest/docs/associations/
    ;(inviteType as any).hasMany(models.invite, { foreignKey: 'inviteType' })
  }

  return inviteType
}
