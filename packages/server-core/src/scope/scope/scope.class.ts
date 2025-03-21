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

import { Paginated } from '@feathersjs/feathers'
import { SequelizeServiceOptions, Service } from 'feathers-sequelize'

import { AdminScope as AdminScopeInterface } from '@etherealengine/engine/src/schemas/interfaces/AdminScope'

import { ScopeTypeType, scopeTypePath } from '@etherealengine/engine/src/schemas/scope/scope-type.schema'
import { UserType, userPath } from '@etherealengine/engine/src/schemas/user/user.schema'
import { Application } from '../../../declarations'
import { UserParams } from '../../api/root-params'

export type AdminScopeDataType = AdminScopeInterface

export class Scope<T = AdminScopeDataType> extends Service<T> {
  app: Application
  docs: any

  constructor(options: Partial<SequelizeServiceOptions>, app: Application) {
    super(options)
    this.app = app
  }

  async find(params?: UserParams): Promise<Paginated<T>> {
    const skip = params?.query?.$skip ? params.query.$skip : 0
    const limit = params?.query?.$limit ? params.query.$limit : 10

    const scopes = (await super.find(params)) as any

    const data = scopes.data ?? scopes
    // TODO: Move following to scope resolver's
    const scopeTypes = (await this.app.service(scopeTypePath)._find({
      query: {
        type: {
          $in: data.map((item) => item.type)
        }
      },
      paginate: false
    })) as any as ScopeTypeType[]

    const users = (await this.app.service(userPath)._find({
      query: {
        id: {
          $in: data.map((item) => item.userId)
        }
      },
      paginate: false
    })) as any as UserType[]

    for (const scope of scopes) {
      scope.user = users.find((item) => item.id === scope.userId)
      scope.scopeType = scopeTypes.find((item) => item.type === scope.type)
    }

    return scopes
  }

  async create(data): Promise<T | T[]> {
    const isArray = Array.isArray(data)
    const whereParams = isArray ? { userId: data[0].userId } : { userId: data.userId }

    const oldScopes = await super.Model.findAll({
      where: whereParams
    })

    if (isArray) {
      let existingData: any = []
      let createData: any = []

      for (const item of data) {
        const existingScope = oldScopes && (oldScopes as any).find((el) => el.type === item.type)
        if (existingScope) {
          existingData.push(existingScope)
        } else {
          createData.push(item)
        }
      }

      if (createData) {
        const createdData: any = await super.create(data)
        return [...existingData, ...createdData]
      }
    }

    const existingScope = (oldScopes as any).find((el) => el.type === data.type)
    if (existingScope) {
      return existingScope
    } else {
      return await super.create(data)
    }
  }
}
