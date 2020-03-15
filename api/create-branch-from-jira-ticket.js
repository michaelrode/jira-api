require('dotenv').config()
const git = require('cmd-executor').git

var JiraClient = require('jira-connector')

const jira = new JiraClient({
    host: 'rigup.atlassian.net',
    basic_auth: {
        email: 'michael.rode@rigup.co',
        api_token: process.env.JIRA_TOKEN,
    },
})

const getJiraFields = async () => {
    const issueKey = process.argv[2].match(/WRK.\d{3,6}/)[0]
    const res = await jira.issue.getIssue({
        issueKey,
        fields: ['key', 'summary'],
    })
    return { key: res.key, name: res.fields.summary }
}

const createBranchName = async () => {
    const { key, name } = await getJiraFields()
    const formattedName = name
        .toLowerCase()
        .split(' ')
        .join('-')
    return `${key}-${formattedName}`
}

;(async () => {
    const branchName = await createBranchName()
    await git.checkout(`-b ${branchName}`)
})()
