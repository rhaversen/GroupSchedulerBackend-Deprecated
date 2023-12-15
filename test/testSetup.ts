// Node.js built-in modules

// Own modules
import logger from '../src/utils/logger.js'
import UserModel from '../src/models/User.js'
import EventModel from '../src/models/Event.js'
import { isMemoryDatabase } from '../src/database/databaseHandler.js'

const server = await import('../src/index.js')

async function getCSRFToken (agent: ChaiHttp.Agent) {
    const res = await agent.get('/csrf-token')
    logger.silly(res.body.csrfToken)
    return res.body.csrfToken
}

async function cleanDatabase () {
    /// ////////////////////////////////////////////
    /// ///////////////////////////////////////////
    if (!isMemoryDatabase()) {
        return
    }
    /// ////////////////////////////////////////////
    /// ///////////////////////////////////////////
    try {
        await UserModel.collection.dropIndexes()
        await EventModel.collection.dropIndexes()
        logger.silly('Indexes dropped successfully')
    } catch (error: any) {
        logger.error('Error dropping indexes:', error ? error.message || error : 'Unknown error')
    }
}

beforeEach(async function () {
})

afterEach(async function () {
    await cleanDatabase()
})

after(function () {
    server.shutDown()
})

export default server
