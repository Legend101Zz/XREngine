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
import { ImCross } from 'react-icons/im'
import { TiTick } from 'react-icons/ti'

import UserIcon from './assets/user.svg'

export const InvitationReceived = () => {
  const InviteReceived: { name: string; date: string }[] = [
    { name: 'John Laouireen', date: '12 Aug 2021' },
    { name: 'John Laouireen', date: '12 Aug 2021' },
    { name: 'John Laouireen', date: '12 Aug 2021' },
    { name: 'John Laouireen', date: '12 Aug 2021' }
  ]

  return (
    <div className="w-[460px] h-[86%] bg-[#15171B]">
      <div className="flex flex-wrap gap-1 mt-2">
        {InviteReceived.map((item) => {
          return (
            <div className="rounded-[10px] bg-[#15171B] w-[450px] h-[45px] flex flex-wrap mt-1 ml-4">
              <div className="rounded-full ml-4 my-2 bg-[#26282B] w-[30px] h-[30px] justify-between">
                <img className="w-[13.64px] mx-2 h-[28.64px] overflow-hidden" alt="" src={UserIcon} />
              </div>
              <div className="justify-items-start ml-1">
                <p className="text-[12px] w-[120px] font-bold text-white mt-[9px] justify-items-start">{item.name}</p>
                <p className="text-[8px] w-[80px]  font-normal text-white justify-items-start">{item.date}</p>
              </div>
              <div className="ml-[175px] flex flex-wrap gap-3 mt-1">
                <div className="rounded-full  my-2 bg-[#26282B] w-[24px] h-[24px] justify-between">
                  <button className="w-[30px] ">
                    <ImCross className="w-[13px] h-[12px] ml-[6.1px] mx-1 mt-[6px] fill-[#DD3333] overflow-hidden" />
                  </button>
                </div>
                <div className="rounded-full  my-2 bg-[#26282B] w-[24px] h-[24px] justify-between">
                  <button className="w-[30px] ">
                    <TiTick className="w-[24px] h-[24px] ml-[0px] mx-1  fill-[#57C290] overflow-hidden" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
