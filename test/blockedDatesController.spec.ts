// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes

// Third-party libraries

// Own modules
import { agent, chai } from './testSetup.js'
import UserModel, { type IUser } from '../src/models/User.js'

// Global variables and setup
const { expect } = chai

// Configs

describe('Create blocked date endpoint PUT api/v1/users/blockedDates/:fromDate/:toDate', function () {
    let testUser: IUser

    let yesterdayISO: string
    let todayISO: string
    let tomorrowISO: string
    let aftermorrowISO: string

    beforeEach(async function () {
        // Create a test user
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })
        testUser.confirmUser()
        await testUser.save()

        await agent.post('/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })

        const yesterdayObj = new Date()
        yesterdayObj.setDate(yesterdayObj.getDate() - 1) // Subtract one day
        yesterdayObj.setHours(0, 0, 0, 0)
        yesterdayISO = yesterdayObj.toISOString()

        const todayObj = new Date()
        todayObj.setHours(0, 0, 0, 0) // Set to start of the day
        todayISO = todayObj.toISOString()

        const tomorrowObj = new Date()
        tomorrowObj.setDate(tomorrowObj.getDate() + 1) // Add one day
        tomorrowObj.setHours(0, 0, 0, 0)
        tomorrowISO = tomorrowObj.toISOString()

        const aftermorrowObj = new Date()
        aftermorrowObj.setDate(aftermorrowObj.getDate() + 2) // Add two days
        aftermorrowObj.setHours(0, 0, 0, 0)
        aftermorrowISO = aftermorrowObj.toISOString()
    })

    it('should have proper res on success', async function () {
        const res = await agent.put(`/v1/users/blockedDates/${todayISO}/${todayISO}`)

        expect(res.status).to.equal(201)
        expect(res.body.message).to.equal('Blocked dates added successfully.')
    })

    it('should create a single date', async function () {
        await agent.put(`/v1/users/blockedDates/${todayISO}/${todayISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(1)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(todayISO)
    })

    it('should create two dates', async function () {
        await agent.put(`/v1/users/blockedDates/${todayISO}/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(2)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(todayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(tomorrowISO)
    })

    it('should create three dates', async function () {
        await agent.put(`/v1/users/blockedDates/${yesterdayISO}/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(3)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(yesterdayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(todayISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(tomorrowISO)
    })

    it('should not create duplicate dates when new dates around old dates', async function () {
        await agent.put(`/v1/users/blockedDates/${todayISO}/${tomorrowISO}`)
        await agent.put(`/v1/users/blockedDates/${yesterdayISO}/${aftermorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(4)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(todayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(tomorrowISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(yesterdayISO)
        expect(updatedTestUser.blockedDates[3].toISOString()).to.equal(aftermorrowISO)
    })

    it('should not create duplicate dates when new dates within old dates', async function () {
        await agent.put(`/v1/users/blockedDates/${yesterdayISO}/${aftermorrowISO}`)
        await agent.put(`/v1/users/blockedDates/${todayISO}/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(4)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(yesterdayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(todayISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(tomorrowISO)
        expect(updatedTestUser.blockedDates[3].toISOString()).to.equal(aftermorrowISO)
    })

    it('should not create duplicate dates when new dates within and after old dates', async function () {
        await agent.put(`/v1/users/blockedDates/${yesterdayISO}/${tomorrowISO}`)
        await agent.put(`/v1/users/blockedDates/${todayISO}/${aftermorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(4)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(yesterdayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(todayISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(tomorrowISO)
        expect(updatedTestUser.blockedDates[3].toISOString()).to.equal(aftermorrowISO)
    })

    it('should not create duplicate dates when new dates on old dates', async function () {
        await agent.put(`/v1/users/blockedDates/${yesterdayISO}/${tomorrowISO}`)
        await agent.put(`/v1/users/blockedDates/${yesterdayISO}/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(3)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(yesterdayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(todayISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(tomorrowISO)
    })

    it('should normalize the date string to the start of the day', async function () {
        const nonNormalizedDate = new Date()
        nonNormalizedDate.setDate(nonNormalizedDate.getDate())
        const nonNormalizedISO = nonNormalizedDate.toISOString()

        const normalizedDate = new Date()
        normalizedDate.setDate(normalizedDate.getDate())
        normalizedDate.setHours(0, 0, 0, 0)
        const normalizedISO = normalizedDate.toISOString()

        await agent.put(`/v1/users/blockedDates/${nonNormalizedISO}/${nonNormalizedISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(1)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(normalizedISO)
    })

    it('should not allow toDate before fromDate', async function () {
        const res = await agent.put(`/v1/users/blockedDates/${tomorrowISO}/${yesterdayISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(res.body.error).to.equal('fromDate must be earlier than toDate')
        expect(res.status).to.equal(400)
        expect(updatedTestUser.blockedDates.length).to.equal(0)
    })

    it('should not allow invalid fromDate', async function () {
        const res = await agent.put(`/v1/users/blockedDates/InvalidDateString/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(res.body.error).to.equal('Invalid date format. Please use valid dates')
        expect(res.status).to.equal(400)
        expect(updatedTestUser.blockedDates.length).to.equal(0)
    })

    it('should not allow invalid toDate', async function () {
        const res = await agent.put(`/v1/users/blockedDates/${todayISO}/InvalidDateString`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(res.body.error).to.equal('Invalid date format. Please use valid dates')
        expect(res.status).to.equal(400)
        expect(updatedTestUser.blockedDates.length).to.equal(0)
    })
})

describe('Delete blocked date endpoint PUT api/v1/users/blockedDates/:fromDate/:toDate', function () {
    let testUser: IUser

    let yesterdayISO: string
    let todayISO: string
    let tomorrowISO: string
    let aftermorrowISO: string
    let afterAftermorrowISO: string

    beforeEach(async function () {
        // Create a test user
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })
        testUser.confirmUser()
        await testUser.save()

        await agent.post('/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })

        const yesterdayObj = new Date()
        yesterdayObj.setDate(yesterdayObj.getDate() - 1) // Subtract one day
        yesterdayObj.setHours(0, 0, 0, 0)
        yesterdayISO = yesterdayObj.toISOString()

        const todayObj = new Date()
        todayObj.setHours(0, 0, 0, 0) // Set to start of the day
        todayISO = todayObj.toISOString()

        const tomorrowObj = new Date()
        tomorrowObj.setDate(tomorrowObj.getDate() + 1) // Add one day
        tomorrowObj.setHours(0, 0, 0, 0)
        tomorrowISO = tomorrowObj.toISOString()

        const aftermorrowObj = new Date()
        aftermorrowObj.setDate(aftermorrowObj.getDate() + 2) // Add two days
        aftermorrowObj.setHours(0, 0, 0, 0)
        aftermorrowISO = aftermorrowObj.toISOString()

        const afterAftermorrowObj = new Date()
        afterAftermorrowObj.setDate(aftermorrowObj.getDate() + 3) // Add three days
        afterAftermorrowObj.setHours(0, 0, 0, 0)
        afterAftermorrowISO = afterAftermorrowObj.toISOString()

        await UserModel.findByIdAndUpdate(testUser._id, { $addToSet: { blockedDates: yesterdayObj } })
        await UserModel.findByIdAndUpdate(testUser._id, { $addToSet: { blockedDates: tomorrowObj } })
        await UserModel.findByIdAndUpdate(testUser._id, { $addToSet: { blockedDates: aftermorrowObj } })
        await UserModel.findByIdAndUpdate(testUser._id, { $addToSet: { blockedDates: afterAftermorrowObj } })
    })

    it('should have proper res on success', async function () {
        const res = await agent.delete(`/v1/users/blockedDates/${yesterdayISO}/${yesterdayISO}`)

        expect(res.status).to.equal(200)
        expect(res.body.message).to.equal('Blocked dates deleted successfully.')
    })

    it('should delete a single date', async function () {
        await agent.delete(`/v1/users/blockedDates/${yesterdayISO}/${yesterdayISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(3)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(tomorrowISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(aftermorrowISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(afterAftermorrowISO)
    })

    it('should delete two dates', async function () {
        await agent.delete(`/v1/users/blockedDates/${tomorrowISO}/${aftermorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(2)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(yesterdayISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(afterAftermorrowISO)
    })

    it('should delete three dates', async function () {
        await agent.delete(`/v1/users/blockedDates/${tomorrowISO}/${afterAftermorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(1)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(yesterdayISO)
    })

    it('should delete two dates with day between dates', async function () {
        await agent.delete(`/v1/users/blockedDates/${yesterdayISO}/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(2)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(aftermorrowISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(afterAftermorrowISO)
    })

    it('should normalize the date string to the start of the day', async function () {
        const nonNormalizedYesterday = new Date()
        nonNormalizedYesterday.setDate(nonNormalizedYesterday.getDate() - 1) // Subtract one day
        const nonNormalizedYesterdayISO = nonNormalizedYesterday.toISOString()

        await agent.delete(`/v1/users/blockedDates/${nonNormalizedYesterdayISO}/${nonNormalizedYesterdayISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(updatedTestUser.blockedDates.length).to.equal(3)
        expect(updatedTestUser.blockedDates[0].toISOString()).to.equal(tomorrowISO)
        expect(updatedTestUser.blockedDates[1].toISOString()).to.equal(aftermorrowISO)
        expect(updatedTestUser.blockedDates[2].toISOString()).to.equal(afterAftermorrowISO)
    })

    it('should not allow toDate before fromDate', async function () {
        const res = await agent.delete(`/v1/users/blockedDates/${tomorrowISO}/${yesterdayISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(res.body.error).to.equal('fromDate must be earlier than toDate')
        expect(res.status).to.equal(400)
        expect(updatedTestUser.blockedDates.length).to.equal(4)
    })

    it('should not allow invalid fromDate', async function () {
        const res = await agent.delete(`/v1/users/blockedDates/InvalidDateString/${tomorrowISO}`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(res.body.error).to.equal('Invalid date format. Please use valid dates')
        expect(res.status).to.equal(400)
        expect(updatedTestUser.blockedDates.length).to.equal(4)
    })

    it('should not allow invalid toDate', async function () {
        const res = await agent.delete(`/v1/users/blockedDates/${tomorrowISO}/InvalidDateString`)

        const updatedTestUser = await UserModel.findById(testUser.id).exec() as IUser

        expect(res.body.error).to.equal('Invalid date format. Please use valid dates')
        expect(res.status).to.equal(400)
        expect(updatedTestUser.blockedDates.length).to.equal(4)
    })
})
