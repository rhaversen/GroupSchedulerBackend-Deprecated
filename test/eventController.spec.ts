// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes

// Third-party libraries
import { parse } from 'cookie'

// Own modules
import server, { agent, chai } from './testSetup.js'
import UserModel, { type IUser } from '../src/models/User.js'
import EventModel, { type IEvent } from '../src/models/Event.js'
import { getExpressPort, getSessionExpiry } from '../src/utils/setupConfig.js'

// Global variables and setup
const { expect } = chai

// Configs
const sessionExpiry = getSessionExpiry()
const expressPort = getExpressPort()

/* describe('Delete User Endpoint DELETE /v1/users/', function () {
    let userA: IUser, userB: IUser
    let event1: IEvent, event2: IEvent
    let agent: ChaiHttp.Agent

    beforeEach(async function () {
        // Create two test users: A and B
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        // Create three test events
        event1 = new EventModel({
            eventName: 'Event 1',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event1.save()

        event2 = new EventModel({
            eventName: 'Event 2',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event2.save()

        // Assign events to users
        await Promise.all([
            // UserA and UserB attends Event 1
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userB._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userA._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userB._id] } } }).exec(),

            // UserA attends Event 2
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event2._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event2._id, { $push: { participants: { $each: [userA._id] } } }).exec()
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should delete the empty event after deletion', async function () {
        await agent.delete('/v1/users/')

        const deletedEvent = await EventModel.findById(event2._id).exec() as IEvent | null

        expect(deletedEvent).to.be.null
    })
}) */
