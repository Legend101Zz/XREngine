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
import OptionsModal from './optionsModal'

const Card = ({ title, description, image }) => {
  return (
    <div
      className="flex flex-col items-center justify-center bg-gradient-to-r from-purple-900 to-indigo-700 text-white border border-solid border-purple-800 rounded-lg p-6 w-72 h-96"
      style={{ backgroundColor: '#5e2265' }}
    >
      <img src={image} alt={title} className="w-32 h-32 rounded-full mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p>{description}</p>
    </div>
  )
}

const HomeScreen = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleKeyPress = (event) => {
    if (event.key === 'Escape') {
      setIsModalOpen(!isModalOpen)
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isModalOpen])
  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-b from-purple-900 to-indigo-700">
      <div className="flex space-x-4">
        <Card title="Card 1" description="This is Card 1 description." image="https://via.placeholder.com/150" />
        <Card title="Card 2" description="This is Card 2 description." image="https://via.placeholder.com/150" />
        <Card title="Card 3" description="This is Card 3 description." image="https://via.placeholder.com/150" />
        <Card title="Card 4" description="This is Card 4 description." image="https://via.placeholder.com/150" />
      </div>
      <OptionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

export default HomeScreen
