// Database configuration
const DB_NAME = 'mqtt_dashboard';
const DB_VERSION = 1;
const SENSOR_STORE = 'sensor_data';

class DatabaseService {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create the sensor data store with indexes
                const store = db.createObjectStore(SENSOR_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('deviceId', 'deviceId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                
                console.log('Database setup complete');
            };
        });
    }

    async saveSensorData(deviceId, data, timestamp) {
        await this.initPromise;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([SENSOR_STORE], 'readwrite');
            const store = transaction.objectStore(SENSOR_STORE);

            const record = {
                deviceId,
                data,
                timestamp
            };

            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getDeviceHistory(deviceId, limit = 50) {
        await this.initPromise;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([SENSOR_STORE], 'readonly');
            const store = transaction.objectStore(SENSOR_STORE);
            const deviceIndex = store.index('deviceId');

            const request = deviceIndex.getAll(deviceId);

            request.onsuccess = () => {
                let results = request.result;
                // Sort by timestamp and limit the results
                results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                results = results.slice(0, limit);
                resolve(results);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async clearOldData(daysToKeep = 7) {
        await this.initPromise;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([SENSOR_STORE], 'readwrite');
            const store = transaction.objectStore(SENSOR_STORE);
            const timestampIndex = store.index('timestamp');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
            const request = timestampIndex.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }
}

// Create and export a single instance
const dbService = new DatabaseService();
export default dbService;
