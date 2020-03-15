require('dotenv').config()
const { git } = require('cmd-executor')
var JiraClient = require('jira-connector')

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

const getProjectName = async () => {
    const fields = await getJiraFields()
    const project = fields.key.split('-')[0].toLowerCase()
    console.log('Project', project)
    return project
}
;(async () => {
    const branchName = await createBranchName()
    const projectName = await getProjectName()
    await git.checkout(`-b ${branchName}`)
})().catch(error => console.log(error.message))
