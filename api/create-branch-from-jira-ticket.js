const { git } = require('cmd-executor')
const JiraClient = require('jira-connector')
const memoize = require('fast-memoize')

const currentWorkingDirectory = process.cwd()
process.chdir('/Users/michaelrode/Code/projects/jira-api')
require('dotenv').config()

if (!process.argv[2])
    return console.error('Error: Must provide Jira url as argument.')
const validUrl = process.argv[2].match(/rigup.atlassian/)
if (!validUrl) return console.error('Error: Invalid Jira URL.')

const jira = new JiraClient({
    host: 'rigup.atlassian.net',
    basic_auth: {
        email: 'michael.rode@rigup.co',
        api_token: process.env.JIRA_TOKEN,
    },
})

process.chdir(currentWorkingDirectory)

const getJiraFields = async () => {
    const issueKey = process.argv[2].match(/WRK.\d{3,6}/)[0]
    const res = await jira.issue.getIssue({
        issueKey,
    })
    return {
        key: res.key,
        name: res.fields.summary,
        type: res.fields.issuetype,
    }
}
const memoizedGetJiraFields = memoize(getJiraFields)

const validateIssueType = async () => {
    const {
        type: { subtask, name },
    } = await memoizedGetJiraFields()

    if (subtask || name === 'Standalone Task') return
    throw `${name} is not a valid issue type`
}

validateIssueType().catch(error => {
    console.log('Error:', error)
    process.exit()
})
const createBranchName = async () => {
    const { key, name, type } = await memoizedGetJiraFields()
    const formattedName = name
        .toLowerCase()
        .split(' ')
        .join('-')
    return `${key}-${formattedName}`
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
    const branchName = await formattedBranchName()
    await git.checkout(`${branchName}`)
})().catch(error => {
    console.log('Error', error)
})
