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

import { BadRequest, Forbidden } from '@feathersjs/errors'
import { Octokit } from '@octokit/rest'
import appRootPath from 'app-root-path'
import fs from 'fs'
import path from 'path'

import { GITHUB_PER_PAGE, GITHUB_URL_REGEX } from '@etherealengine/common/src/constants/GitHubConstants'
import { ProjectInterface } from '@etherealengine/common/src/interfaces/ProjectInterface'
import {
  AudioFileTypes,
  ImageFileTypes,
  VideoFileTypes,
  VolumetricFileTypes
} from '@etherealengine/engine/src/assets/constants/fileTypes'

import {
  IdentityProviderType,
  identityProviderPath
} from '@etherealengine/engine/src/schemas/user/identity-provider.schema'
import { UserType } from '@etherealengine/engine/src/schemas/user/user.schema'
import { Paginated } from '@feathersjs/feathers'
import { Application } from '../../../declarations'
import logger from '../../ServerLogger'
import config from '../../appconfig'
import { getFileKeysRecursive } from '../../media/storageprovider/storageProviderUtils'
import { getStorageProvider } from '../../media/storageprovider/storageprovider'
import { deleteFolderRecursive, writeFileSyncRecursive } from '../../util/fsHelperFunctions'
import { useGit } from '../../util/gitHelperFunctions'
import { ProjectParams } from './project.class'

let app

export const getAuthenticatedRepo = async (token: string, repositoryPath: string) => {
  try {
    if (!/.git$/.test(repositoryPath)) repositoryPath = repositoryPath + '.git'
    repositoryPath = repositoryPath.toLowerCase()
    const user = await getUser(token)
    return repositoryPath.replace('https://', `https://${user.data.login}:${token}@`)
  } catch (error) {
    logger.error(error)
    return null
  }
}

export const getUser = async (token: string) => {
  const octoKit = new Octokit({ auth: token })
  return octoKit.rest.users.getAuthenticated() as any
}

export const getInstallationOctokit = async (repo) => {
  if (!repo) return null
  let installationId
  await app.eachInstallation(({ installation }) => {
    if (repo.user == installation.account?.login) installationId = installation.id
  })
  const installationAuth = await app.octokit.auth({
    type: 'installation',
    installationId: installationId
  })

  return new Octokit({
    auth: installationAuth.token // directly pass the token
  })
}

export const checkUserRepoWriteStatus = async (owner, repo, token): Promise<number> => {
  const userApp = new Octokit({ auth: token })
  try {
    const { data } = await userApp.rest.repos.get({
      owner,
      repo
    })
    if (!data.permissions) return 403
    return data.permissions.push || data.permissions.admin ? 200 : 403
  } catch (err) {
    logger.error(err, 'Error getting repo')
    return err.status
  }
}

export const checkUserOrgWriteStatus = async (org, token) => {
  const octo = new Octokit({ auth: token })
  try {
    const authUser = await octo.rest.users.getAuthenticated()
    if (org === authUser.data.login) return 200
    const { data } = await octo.rest.orgs.getMembershipForAuthenticatedUser({
      org
    })
    return data.role === 'admin' || data.role === 'member' ? 200 : 403
  } catch (err) {
    logger.error(err, 'Org does not exist')
    return err.status
  }
}

export const checkAppOrgStatus = async (organization, token) => {
  const octo = new Octokit({ auth: token })
  const authUser = await octo.rest.users.getAuthenticated()
  if (organization === authUser.data.login) return 200
  const orgs = await getUserOrgs(token)
  return orgs.find((org) => org.login.toLowerCase() === organization.toLowerCase())
}

export const getUserRepos = async (token?: string): Promise<any[]> => {
  let page = 1
  let end = false
  let repos = []
  const octoKit = new Octokit({ auth: token })
  while (!end) {
    const repoResponse = (await octoKit.rest.repos.listForAuthenticatedUser({
      per_page: GITHUB_PER_PAGE,
      page
    })) as any
    repos = repos.concat(repoResponse.data)
    page++
    if (repoResponse.data.length < GITHUB_PER_PAGE) end = true
  }
  return repos
}

export const getUserOrgs = async (token: string): Promise<any[]> => {
  let page = 1
  let end = false
  let orgs = []
  const octoKit = new Octokit({ auth: token })
  while (!end) {
    const repoResponse = (await octoKit.rest.orgs.listForAuthenticatedUser({
      per_page: GITHUB_PER_PAGE,
      page
    })) as any
    orgs = orgs.concat(repoResponse.data)
    page++
    if (repoResponse.data.length < GITHUB_PER_PAGE) end = true
  }
  return orgs
}

export const getRepo = async (owner: string, repo: string, token: string): Promise<any> => {
  const octoKit = new Octokit({ auth: token })
  const repoResponse = await octoKit.rest.repos.get({ owner, repo })
  return repoResponse.data.html_url
}

export const pushProjectToGithub = async (
  app: Application,
  project: ProjectInterface,
  user: UserType,
  reset = false,
  commitSHA?: string,
  storageProviderName?: string
) => {
  const storageProvider = getStorageProvider(storageProviderName)
  try {
    logger.info(`[ProjectPush]: Getting files for project "${project.name}"...`)
    let files = await getFileKeysRecursive(`projects/${project.name}/`)
    files = files.filter((file) => /\.\w+$/.test(file))
    logger.info('[ProjectPush]: Found files:' + files)

    const localProjectDirectory = path.join(appRootPath.path, 'packages/projects/projects', project.name)
    if (fs.existsSync(localProjectDirectory)) {
      logger.info('[Project temp debug]: fs exists, deleting')
      deleteFolderRecursive(localProjectDirectory)
    }

    await Promise.all(
      files.map(async (filePath) => {
        logger.info(`[ProjectLoader]: - downloading "${filePath}"`)
        const fileResult = await storageProvider.getObject(filePath)
        if (fileResult.Body.length === 0) logger.info(`[ProjectLoader]: WARNING file "${filePath}" is empty`)
        writeFileSyncRecursive(path.join(appRootPath.path, 'packages/projects', filePath), fileResult.Body)
      })
    )
    const repoPath = project.repositoryPath.toLowerCase()

    const githubIdentityProvider = (await app.service(identityProviderPath).find({
      query: {
        userId: user.id,
        type: 'github',
        $limit: 1
      }
    })) as Paginated<IdentityProviderType>

    const githubPathRegexExec = GITHUB_URL_REGEX.exec(repoPath)
    if (!githubPathRegexExec) throw new BadRequest('Invalid Github URL')
    const split = githubPathRegexExec[2].split('/')
    const owner = split[0]
    const repo = split[1].replace('.git', '')

    if (githubIdentityProvider.data.length === 0)
      throw new Forbidden('You must log out and log back in with Github to refresh the token, and then try again.')

    const octoKit = new Octokit({ auth: githubIdentityProvider.data[0].oauthToken })
    if (!octoKit) return
    try {
      await octoKit.rest.repos.get({
        owner,
        repo
      })
    } catch (err) {
      if (err.status === 404) {
        const authUser = await octoKit.rest.users.getAuthenticated()
        if (authUser.data.login === owner)
          await octoKit.repos.createForAuthenticatedUser({
            name: repo,
            auto_init: true
          })
        else await octoKit.repos.createInOrg({ org: owner, name: repo, auto_init: true })
      } else throw err
    }
    const deploymentBranch = `${config.server.releaseName}-deployment`
    if (reset) {
      const projectDirectory = path.resolve(appRootPath.path, `packages/projects/projects/${project.name}/`)
      const git = useGit(projectDirectory)
      if (commitSHA) git.checkout(commitSHA)
      await git.checkoutLocalBranch(deploymentBranch)
      await git.push('origin', deploymentBranch, ['-f'])
    } else await uploadToRepo(octoKit, files, owner, repo, deploymentBranch, project, app)
  } catch (err) {
    logger.error(err)
    throw err
  }
}

// Credit to https://dev.to/lucis/how-to-push-files-programatically-to-a-repository-using-octokit-with-typescript-1nj0
// for much of the following code.
const uploadToRepo = async (
  octo: Octokit,
  filePaths: string[],
  org: string,
  repo: string,
  branch = `master`,
  project: ProjectInterface,
  app: Application
) => {
  let currentCommit
  try {
    currentCommit = await getCurrentCommit(octo, org, repo, branch)
  } catch (err) {
    if (err.status === 409 && err.message === 'Git Repository is empty.') {
      await octo.repos.delete({ owner: org, repo })
      await octo.repos.createInOrg({ org, name: repo, auto_init: true })
      currentCommit = await getCurrentCommit(octo, org, repo, branch)
    } else throw err
  }
  //Get the GH user for use in commit message
  const user = (await octo.users.getAuthenticated()).data
  //Create blobs from all the files
  const fileBlobs = await Promise.all(filePaths.map(createBlobForFile(octo, org, repo)))
  // Create a new tree from all of the files, so that a new commit can be made from it
  const newTree = await createNewTree(
    octo,
    org,
    repo,
    fileBlobs,
    filePaths.map((path) => path.replace(`projects/${project.name}/`, '')),
    currentCommit.treeSha
  )
  const date = Date.now()
  const commitMessage = `Update by ${user.login} at ${new Date(date).toJSON()}`
  //Create the new commit with all of the file changes
  const newCommit = await createNewCommit(octo, org, repo, commitMessage, newTree.sha, currentCommit.commitSha)
  await app.service('project').Model.update(
    {
      commitSHA: newCommit.sha,
      commitDate: new Date()
    },
    {
      where: {
        id: project.id
      }
    }
  )
  try {
    //This pushes the commit to the main branch in GitHub
    await setBranchToCommit(octo, org, repo, branch, newCommit.sha)
  } catch (err) {
    // Couldn't push directly to branch for some reason, so making a new branch and opening a PR instead
    await octo.git.createRef({
      owner: org,
      repo,
      ref: `refs/heads/${user.login}-${date}`,
      sha: newCommit.sha
    })
    await octo.pulls.create({
      owner: org,
      repo,
      head: `refs/heads/${user.login}-${date}`,
      base: `refs/heads/${branch}`,
      title: commitMessage
    })
  }
}
export const getCurrentCommit = async (octo: Octokit, org: string, repo: string, branch = 'master') => {
  try {
    await octo.repos.getBranch({ owner: org, repo, branch })
  } catch (err) {
    // If the branch for this deployment somehow doesn't exist, push the default branch to it so it exists
    if (err.status === 404 && err.message === 'Branch not found') {
      const repoResult = await octo.repos.get({ owner: org, repo })
      const baseBranchRef = await octo.git.getRef({
        owner: org,
        repo,
        ref: `heads/${repoResult.data.default_branch}`
      })
      await octo.git.createRef({
        owner: org,
        repo,
        ref: `refs/heads/${branch}`,
        sha: baseBranchRef.data.object.sha
      })
    } else throw err
  }
  const { data: refData } = await octo.git.getRef({
    owner: org,
    repo,
    ref: `heads/${branch}`
  })
  const commitSha = refData.object.sha
  const { data: commitData } = await octo.git.getCommit({
    owner: org,
    repo,
    commit_sha: commitSha
  })
  return {
    commitSha,
    treeSha: commitData.tree.sha
  }
}

export const getGithubOwnerRepo = (url: string) => {
  url = url.toLowerCase()

  const githubPathRegexExec = GITHUB_URL_REGEX.exec(url)
  if (!githubPathRegexExec)
    return {
      error: 'invalidUrl',
      text: 'Project URL is not a valid GitHub URL, or the GitHub repo is private'
    }
  const split = githubPathRegexExec[2].split('/')
  if (!split[0] || !split[1])
    return {
      error: 'invalidUrl',
      text: 'Project URL is not a valid GitHub URL, or the GitHub repo is private'
    }
  const owner = split[0]
  const repo = split[1].replace('.git', '')
  return {
    owner,
    repo
  }
}

export const getOctokitForChecking = async (app: Application, url: string, params: ProjectParams) => {
  url = url.toLowerCase()

  const githubIdentityProvider = (await app.service(identityProviderPath).find({
    query: {
      userId: params!.user.id,
      type: 'github',
      $limit: 1
    }
  })) as Paginated<IdentityProviderType>

  if (githubIdentityProvider.data.length === 0)
    throw new Forbidden('You must have a connected GitHub account to access public repos')
  const { owner, repo } = getGithubOwnerRepo(url)
  const octoKit = new Octokit({ auth: githubIdentityProvider.data[0].oauthToken })
  return {
    owner,
    repo,
    octoKit,
    token: githubIdentityProvider.data[0].oauthToken
  }
}

const createBlobForFile = (octo: Octokit, org: string, repo: string) => async (filePath: string) => {
  const encoding = isBase64Encoded(filePath) ? 'base64' : 'utf-8'
  const bytes = await fs.readFileSync(path.join(appRootPath.path, 'packages/projects', filePath), 'binary')
  const buffer = Buffer.from(bytes, 'binary')
  const content = buffer.toString(encoding)
  const blobData = await octo.git.createBlob({
    owner: org,
    repo,
    content,
    encoding
  })
  return blobData.data
}

const createNewTree = async (
  octo: Octokit,
  owner: string,
  repo: string,
  blobs: any[],
  paths: string[],
  parentTreeSha: string
) => {
  const oldTree = await octo.git.getTree({
    owner,
    repo,
    tree_sha: parentTreeSha,
    recursive: 'true'
  })
  const committableFiles = oldTree.data.tree.filter((file) => file.type === 'blob')
  const committableFilesMap = committableFiles.map((file) => file.path)
  // My custom config. Could be taken as parameters
  const tree = blobs.map(({ sha }, index) => ({
    path: paths[index],
    mode: `100644`,
    type: `blob`,
    sha
  })) as any[]
  committableFilesMap.forEach((fileName) => {
    if (fileName && paths.indexOf(fileName) < 0) {
      tree.push({
        path: fileName,
        mode: `100644`,
        type: 'blob',
        sha: null
      })
    }
  })
  const { data } = await octo.git.createTree({
    owner,
    repo,
    tree,
    base_tree: parentTreeSha
  })
  return data
}

const createNewCommit = async (
  octo: Octokit,
  org: string,
  repo: string,
  message: string,
  currentTreeSha: string,
  currentCommitSha: string
) =>
  (
    await octo.git.createCommit({
      owner: org,
      repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha]
    })
  ).data

const setBranchToCommit = (octo: Octokit, org: string, repo: string, branch = `master`, commitSha: string) =>
  octo.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha
  })

const isBase64Encoded = (filePath: string) => {
  const extension = `.${filePath.split('.').pop()!}`
  return (
    ImageFileTypes.indexOf(extension) > -1 ||
    AudioFileTypes.indexOf(extension) > -1 ||
    VolumetricFileTypes.indexOf(extension) > -1 ||
    VideoFileTypes.indexOf(extension) > -1
  )
}
