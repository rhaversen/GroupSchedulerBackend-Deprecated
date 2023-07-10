import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

const connectToDatabase = async () => {
  const env = process.env.NODE_ENV;

  // Use in-memory database for testing
  if (env === 'test') {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getUri();

    try {
      await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
      logger.info('Connected to in-memory MongoDB...');
    } catch (error) {
      logger.error(`Error connecting to in-memory MongoDB: ${error.message}`);
    }
  }

  // Use real database for development and production
  else {
    logger.info(`Attempting to connect to to MongoDB`);
    const maxRetryAttempts = process.env.DB_CONNECTION_RETRY_MAX_ATTEMPTS || 5;
    const retryInterval = process.env.DB_CONNECTION_RETRY_INTERVAL || 1000;
  
    let currentRetryAttempt = 0;
  
    while (currentRetryAttempt < maxRetryAttempts) {
      try {
        await mongoose.connect(
          `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}`, 
          { useNewUrlParser: true, useUnifiedTopology: true }
        );
        logger.info('MongoDB Connected...');
        return; // Exit the function if the connection is successful
      } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        currentRetryAttempt++;
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }
    logger.error(`Failed to connect to MongoDB after ${maxRetryAttempts} attempts.`);
  }
};

const disconnectFromDatabase = async () => {
  if (process.env.NODE_ENV === 'test' && mongoServer) {
    try {
      await mongoose.disconnect();
      await mongoServer.stop();
      logger.info('Disconnected from in-memory MongoDB');
    } catch (error) {
      logger.error(`Error disconnecting from in-memory MongoDB: ${error.message}`);
    }
  } else {
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error(`Error disconnecting from MongoDB: ${error.message}`);
    }
  }
};

const deleteAllDocumentsFromAllCollections = async () => {
    try {
        const collections = Object.keys(mongoose.connection.collections);
        for (const collectionName of collections) {
            const collection = mongoose.connection.collections[collectionName];
            await collection.deleteMany({});
        }
        logger.info('All documents from all collections have been deleted');
    } catch (error) {
        logger.error(`Error deleting documents from MongoDB: ${error.message}`);
    }
};

export { connectToDatabase, disconnectFromDatabase, deleteAllDocumentsFromAllCollections };