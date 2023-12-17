// Node.js built-in modules

// Third-party libraries
import chai from 'chai'
import chaiHttp from 'chai-http'

// Own modules
import logger from '../src/utils/logger.js'
import UserModel from '../src/models/User.js'
import EventModel from '../src/models/Event.js'
import { isMemoryDatabase } from '../src/database/databaseHandler.js'

// Test env
process.env.SESSION_SECRET = 'test_secret_key'

const server = await import('../src/index.js')
chai.use(chaiHttp)

async function getCSRFToken (agent: ChaiHttp.Agent): Promise<any> {
    const res = await agent.get('/csrf-token')
    logger.silly(res.body.csrfToken)
    return res.body.csrfToken
}

let agent: ChaiHttp.Agent

async function cleanDatabase () {
    /// ////////////////////////////////////////////
    /// ///////////////////////////////////////////
    if (!isMemoryDatabase()) {
        logger.warn('Not cleaning database, not a memory database')
        return
    }
    /// ////////////////////////////////////////////
    /// ///////////////////////////////////////////
    logger.debug('Cleaning databases')
    try {
        await UserModel.deleteMany({})
        await EventModel.deleteMany({})
        logger.silly('Indexes dropped successfully')
    } catch (err) {
        if (err instanceof Error) {
            logger.error(`Error dropping indexes: ${err.message}`)
        } else {
            logger.error('Error dropping indexes: An unknown error occurred')
        }
        logger.error('Shutting down')
        process.exit(1)
    }
}

beforeEach(async function () {
    agent = chai.request.agent(server.app) // Create an agent instance
})

afterEach(async function () {
    agent.close()
    await cleanDatabase()
})

after(function () {
    server.shutDown()
})

export default server
export { agent, chai }
