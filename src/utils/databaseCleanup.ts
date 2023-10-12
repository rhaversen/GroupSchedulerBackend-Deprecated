import EventModel from '../models/Event.js' // Adjust the import path to your actual IEvent interface
import logger from './logger.js'

async function deleteEmptyEvents (): Promise<void> {
    try {
    // Find and delete events with no participants (adjust the condition as needed)
        await EventModel.deleteMany({ participants: { $size: 0 } }).exec()
        logger.info('Empty events deleted successfully')
    } catch (error) {
        logger.error('Error deleting empty events:', error)
    }
}
