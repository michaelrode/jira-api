const { git } = require('cmd-executor')
const memoize = require('fast-memoize')
const changeCase = require('change-case')
const axios = require('axios').default
const { Version3Client } = require('jira.js')

const client = new Version3Client({
    host: 'https://workrise.atlassian.net',
    newErrorHandling: true,
    authentication: {
        personalAccessToken:
            'bWljaGFlbC5yb2RlQHdvcmtyaXNlLmNvbTpBVEFUVDN4RmZHRjBiT013OVVIWXRJOF9MbXFhVFVValpnaEpFbmRuNlgwMlVpZ2Y4RXpfOFNTR0s3TmZMTGxKNWR6bFk4Y20yR0RHc0ZUWXplOEhpd0M1aS1wQmJ0b3VYUVh6YUxycm5qdGdMUm85V0J4ejlpQWhYZTgwTEx2OW1xb3FrMC1jUmxjVnhMY2JGMVYyYW8taURTY3g1bmtjYzZWdTlNUW10ckxndlE4N3FHMnBOeE09Njc4MjA3RUU=',
    },
})

require('dotenv').config()
const currentWorkingDirectory = process.cwd()
process.chdir('/Users/michael.rode/code/general/jira-api')

const createClient = (
    baseURL = 'https://workrise.atlassian.net/rest/api/2/'
) => {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic bWljaGFlbC5yb2RlQHdvcmtyaXNlLmNvbTpBVEFUVDN4RmZHRjBiT013OVVIWXRJOF9MbXFhVFVValpnaEpFbmRuNlgwMlVpZ2Y4RXpfOFNTR0s3TmZMTGxKNWR6bFk4Y20yR0RHc0ZUWXplOEhpd0M1aS1wQmJ0b3VYUVh6YUxycm5qdGdMUm85V0J4ejlpQWhYZTgwTEx2OW1xb3FrMC1jUmxjVnhMY2JGMVYyYW8taURTY3g1bmtjYzZWdTlNUW10ckxndlE4N3FHMnBOeE09Njc4MjA3RUU=`,
    }

    const axiosOptions = {
        baseURL,
        headers,
    }

    return axios.create(axiosOptions)
}

const jiraClient = createClient()

const fetchIssueData = async jiraKey => {
    try {
        const { data } = await jiraClient.get(`issue/${jiraKey}`)

        return {
            key: data.key,
            name: data.fields.summary,
            type: data.fields.issuetype,
        }
    } catch (err) {
        console.error(
            `Error fetching ${jiraKey}`,
            'Status:',
            err?.response?.status,
            err?.response?.statusText
        )
    }
}

if (!process.argv[2])
    return console.error('Error: Must provide Jira url as argument.')
const validUrl = process.argv[2].match(/workrise.atlassian/)
if (!validUrl) return console.error('Error: Invalid Jira URL.')

process.chdir(currentWorkingDirectory)

const getJiraFields = async () => {
    const key =
        process.argv[2].match(/WRK.\d{3,6}/) ||
        process.argv[2].match(/EE.\d{3,6}/) ||
        process.argv[2].match(/SRED.\d{3,6}/) ||
        process.argv[2].match(/SRE23.\d{2,6}/)

    return await fetchIssueData(key[0])
}
const memoizedGetJiraFields = memoize(getJiraFields)

const validateIssueType = async () => {
    const {
        type: { subtask, name },
    } = await memoizedGetJiraFields()

    if (name) return
    throw `${name} is not a valid issue type`
}

validateIssueType().catch(error => {
    console.log('Error:', error)
    process.exit()
})
const createBranchName = async () => {
    const { key, name, type } = await memoizedGetJiraFields()
    return `${key}-${changeCase.paramCase(name)}`
}

const newBranch = async branchName => {
    const currentBranches = await git.branch()
    return !currentBranches.includes(branchName)
}

const formattedBranchName = async () => {
    let branchName = await createBranchName()
    const isNewBranch = await newBranch(branchName)
    return isNewBranch ? `-b ${branchName}` : branchName
}
;(async () => {
    // await runthis()
    const branchName = await formattedBranchName()

    await git.checkout(`${branchName}`)
})().catch(error => {
    console.log('Error', error)
})
