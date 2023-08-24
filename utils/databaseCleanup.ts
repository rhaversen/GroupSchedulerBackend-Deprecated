import EventModel from '../models/Event.js'; // Adjust the import path to your actual IEvent interface

async function deleteEmptyEvents(): Promise<void> {
  try {
    // Find and delete events with no participants (adjust the condition as needed)
    await EventModel.deleteMany({ participants: { $size: 0 } }).exec();
    console.log('Empty events deleted successfully');
  } catch (error) {
    console.error('Error deleting empty events:', error);
  }
}