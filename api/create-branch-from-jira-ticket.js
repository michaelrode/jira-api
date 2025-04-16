const { git } = require('cmd-executor')
const memoize = require('fast-memoize')
const changeCase = require('change-case')
const axios = require('axios').default
const { Version3Client } = require('jira.js')
require('dotenv').config({
    path: '/Users/michael.rode/code/tools/jira-api/.env',
})

const JIRA_HOST = 'https://workrise.atlassian.net'
const JIRA_API_BASE_URL = `${JIRA_HOST}/rest/api/2/`
const PERSONAL_ACCESS_TOKEN = process.env.PERSONAL_ACCESS_TOKEN

if (!PERSONAL_ACCESS_TOKEN) {
    console.error(
        'Error: PERSONAL_ACCESS_TOKEN is not defined in the environment variables.'
    )
    process.exit(1)
}

const client = new Version3Client({
    host: JIRA_HOST,
    newErrorHandling: true,
    authentication: {
        personalAccessToken: PERSONAL_ACCESS_TOKEN,
    },
})

const createClient = (baseURL = JIRA_API_BASE_URL) => {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${PERSONAL_ACCESS_TOKEN}`,
    }

    return axios.create({ baseURL, headers })
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

const getJiraKeyFromUrl = url => {
    const key =
        url.match(/WRK.\d{3,6}/) ||
        url.match(/EE.\d{3,6}/) ||
        url.match(/SRED.\d{3,6}/) ||
        url.match(/SRE23.\d{2,6}/)
    return key ? key[0] : null
}

const getJiraFields = async url => {
    const key = getJiraKeyFromUrl(url)
    if (!key) throw new Error('Invalid Jira URL.')
    return await fetchIssueData(key)
}

const memoizedGetJiraFields = memoize(getJiraFields)

const validateIssueType = async url => {
    const {
        type: { name },
    } = await memoizedGetJiraFields(url)
    if (!name) throw new Error(`${name} is not a valid issue type`)
}

const createBranchName = async url => {
    const { key, name } = await memoizedGetJiraFields(url)
    return `${key}-${changeCase.paramCase(name)}`
}

const isNewBranch = async branchName => {
    const currentBranches = await git.branch()
    return !currentBranches.includes(branchName)
}

const formattedBranchName = async url => {
    const branchName = await createBranchName(url)
    return (await isNewBranch(branchName)) ? `-b ${branchName}` : branchName
}

const main = async () => {
    const jiraUrl = process.argv[2]
    if (!jiraUrl) {
        console.error('Error: Must provide Jira URL as argument.')
        process.exit(1)
    }

    try {
        await validateIssueType(jiraUrl)
        const branchName = await formattedBranchName(jiraUrl)
        await git.checkout(branchName)
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

main()
