import dbService from './db.js';
import authService from './auth.js';

const { createApp, ref, reactive, computed, nextTick, onMounted, onUnmounted } = Vue;

createApp({
    setup() {
        const isAuthenticated = ref(false);
        const username = ref('');
        const password = ref('');
        const loginError = ref('');
        const client = ref(null);
        const connectionStatus = ref('Disconnected');
        const messages = ref([]);
        const devices = ref({});
        const selectedDevice = ref(null);
        const connectionError = ref(null);
        const charts = ref({});
        const updateQueue = ref([]);
        const isUpdating = ref(false);

        // Check if user is already authenticated
        isAuthenticated.value = authService.checkAuth();

        const mqttOptions = {
            hostname: '270e5d38ecbe4c2b89b7e54a787d3068.s1.eu.hivemq.cloud',
            port: 8884,
            protocol: 'wss',
            username: 'GitLabUser',
            password: '!+a7Sp9G8spZK}D',
            clean: true,
            connectTimeout: 30000,
            reconnectPeriod: 5000,
            clientId: 'mqtt_vue_' + Math.random().toString(16).substr(2, 8),
            keepalive: 60,
            rejectUnauthorized: false
        };

        const connectionStatusClass = computed(() => ({
            'connected': connectionStatus.value === 'Connected',
            'disconnected': connectionStatus.value === 'Disconnected',
            'connecting': connectionStatus.value === 'Connecting...'
        }));

        const deviceList = computed(() => Object.keys(devices.value));

        const currentDeviceData = computed(() => 
            selectedDevice.value ? devices.value[selectedDevice.value] : null
        );

        async function processUpdateQueue() {
            if (isUpdating.value || updateQueue.value.length === 0) return;
            
            isUpdating.value = true;
            const deviceId = updateQueue.value.shift();
            
            try {
                const device = devices.value[deviceId];
                if (!device || !device.history) return;

                const colors = ['#ff6384', '#36a2eb', '#ffce56'];
                const history = device.history;

                await nextTick(); // Wait for DOM update

                for (let i = 1; i <= 3; i++) {
                    const canvasId = `sensor${i}-graph-${deviceId}`;
                    const canvas = document.getElementById(canvasId);
                    if (!canvas) {
                        console.warn(`Canvas element ${canvasId} not found, retrying...`);
                        // Re-queue this device for another attempt
                        updateQueue.value.push(deviceId);
                        return;
                    }

                    // Destroy existing chart
                    if (charts.value[canvasId]) {
                        charts.value[canvasId].destroy();
                        delete charts.value[canvasId];
                    }

                    const ctx = canvas.getContext('2d');
                    const datasets = [];
                    
                    for (let j = 1; j <= 3; j++) {
                        datasets.push({
                            label: `Line ${j}`,
                            data: history[`sensor${i}`][`L${j}`].slice(-50),
                            borderColor: colors[j-1],
                            fill: false,
                            tension: 0.4
                        });
                    }

                    charts.value[canvasId] = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: history.timestamps.slice(-50),
                            datasets: datasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: false,
                            elements: {
                                point: {
                                    radius: 0
                                }
                            },
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top'
                                }
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error updating charts:', error);
                // Re-queue on error
                updateQueue.value.push(deviceId);
            } finally {
                isUpdating.value = false;
                // Process next update if available
                if (updateQueue.value.length > 0) {
                    setTimeout(processUpdateQueue, 100);
                }
            }
        }

        function queueChartUpdate(deviceId) {
            if (!updateQueue.value.includes(deviceId)) {
                updateQueue.value.push(deviceId);
                nextTick(() => {
                    processUpdateQueue();
                });
            }
        }

        async function loadDeviceHistory(deviceId) {
            try {
                const history = await dbService.getDeviceHistory(deviceId);
                if (history.length > 0) {
                    const deviceData = devices.value[deviceId] || {
                        device_serial: deviceId,
                        tftvalue: {},
                        lastUpdate: new Date().toLocaleTimeString(),
                        history: {
                            timestamps: [],
                            sensor1: { L1: [], L2: [], L3: [] },
                            sensor2: { L1: [], L2: [], L3: [] },
                            sensor3: { L1: [], L2: [], L3: [] }
                        }
                    };

                    history.forEach(record => {
                        deviceData.history.timestamps.unshift(new Date(record.timestamp).toLocaleTimeString());
                        for (let i = 1; i <= 3; i++) {
                            for (let j = 1; j <= 3; j++) {
                                const value = record.data[`S${i}_L${j}`] || 0;
                                deviceData.history[`sensor${i}`][`L${j}`].unshift(value);
                            }
                        }
                    });

                    devices.value = { ...devices.value, [deviceId]: deviceData };
                    queueChartUpdate(deviceId);
                }
            } catch (error) {
                console.error('Error loading device history:', error);
            }
        }

        function cleanupCharts() {
            Object.entries(charts.value).forEach(([id, chart]) => {
                if (chart) {
                    chart.destroy();
                    delete charts.value[id];
                }
            });
        }

        function connectMQTT() {
            if (client.value) {
                try {
                    client.value.end(true);
                } catch (e) {
                    console.error('Error ending previous connection:', e);
                }
            }

            connectionStatus.value = 'Connecting...';
            connectionError.value = null;

            try {
                console.log('Connecting to MQTT broker...');
                const url = `${mqttOptions.protocol}://${mqttOptions.hostname}:${mqttOptions.port}/mqtt`;
                console.log('MQTT URL:', url);
                
                client.value = mqtt.connect(url, mqttOptions);

                client.value.on('connect', () => {
                    console.log('Connected to MQTT broker');
                    connectionStatus.value = 'Connected';
                    connectionError.value = null;
                    client.value.subscribe('/TFT/Response', { qos: 1 }, async (err) => {
                        if (err) {
                            console.error('Subscription error:', err);
                            connectionError.value = 'Failed to subscribe to topic';
                        } else {
                            console.log('Subscribed to /TFT/Response');
                            // Load history for all known devices
                            for (const deviceId of Object.keys(devices.value)) {
                                await loadDeviceHistory(deviceId);
                            }
                        }
                    });
                });

                client.value.on('message', async (topic, message) => {
                    if (topic === '/TFT/Response') {
                        try {
                            const data = JSON.parse(message.toString());
                            const deviceId = data.device_serial;
                            
                            if (deviceId) {
                                const timestamp = new Date().toISOString();
                                const deviceData = devices.value[deviceId] || {
                                    device_serial: deviceId,
                                    tftvalue: {},
                                    lastUpdate: new Date(timestamp).toLocaleTimeString(),
                                    history: {
                                        timestamps: [],
                                        sensor1: { L1: [], L2: [], L3: [] },
                                        sensor2: { L1: [], L2: [], L3: [] },
                                        sensor3: { L1: [], L2: [], L3: [] }
                                    }
                                };

                                // Save to IndexedDB
                                await dbService.saveSensorData(deviceId, data.tftvalue, timestamp);

                                // Update current values
                                deviceData.tftvalue = data.tftvalue || {};
                                deviceData.lastUpdate = new Date(timestamp).toLocaleTimeString();

                                // Update history
                                deviceData.history.timestamps.push(deviceData.lastUpdate);
                                
                                for (let i = 1; i <= 3; i++) {
                                    for (let j = 1; j <= 3; j++) {
                                        const value = parseFloat(data.tftvalue[`S${i}_L${j}`]) || 0;
                                        deviceData.history[`sensor${i}`][`L${j}`].push(value);
                                    }
                                }

                                // Keep only last 50 points in memory
                                if (deviceData.history.timestamps.length > 50) {
                                    deviceData.history.timestamps = deviceData.history.timestamps.slice(-50);
                                    for (let i = 1; i <= 3; i++) {
                                        for (let j = 1; j <= 3; j++) {
                                            deviceData.history[`sensor${i}`][`L${j}`] = 
                                                deviceData.history[`sensor${i}`][`L${j}`].slice(-50);
                                        }
                                    }
                                }

                                // Update devices
                                devices.value = { ...devices.value, [deviceId]: deviceData };

                                // Auto-select first device if none selected
                                if (!selectedDevice.value) {
                                    selectedDevice.value = deviceId;
                                }

                                // Queue chart update for this device
                                queueChartUpdate(deviceId);

                                // Update message history
                                messages.value = [
                                    {
                                        topic,
                                        payload: data,
                                        timestamp: deviceData.lastUpdate
                                    },
                                    ...messages.value.slice(0, 99)
                                ];
                            }
                        } catch (e) {
                            console.error('Error parsing message:', e);
                        }
                    }
                });

                client.value.on('error', (error) => {
                    console.error('MQTT Error:', error);
                    connectionStatus.value = 'Disconnected';
                    connectionError.value = error.message || 'Connection failed';
                });

                client.value.on('close', () => {
                    console.log('MQTT Connection closed');
                    connectionStatus.value = 'Disconnected';
                });

                client.value.on('offline', () => {
                    console.log('MQTT Client is offline');
                    connectionStatus.value = 'Disconnected';
                });

                client.value.on('reconnect', () => {
                    console.log('Attempting to reconnect...');
                    connectionStatus.value = 'Connecting...';
                });

            } catch (error) {
                console.error('MQTT Connection Error:', error);
                connectionStatus.value = 'Disconnected';
                connectionError.value = error.message || 'Failed to establish connection';
            }
        }

        function login() {
            if (authService.login(username.value, password.value)) {
                isAuthenticated.value = true;
                loginError.value = '';
                connectMQTT(); // Connect to MQTT after successful login
            } else {
                loginError.value = 'Invalid username or password';
            }
        }

        function logout() {
            authService.logout();
            isAuthenticated.value = false;
            username.value = '';
            password.value = '';
            // Disconnect MQTT
            if (client.value) {
                client.value.end(true);
            }
            // Clear data
            messages.value = [];
            devices.value = {};
            selectedDevice.value = null;
            cleanupCharts();
        }

        async function selectDevice(deviceId) {
            selectedDevice.value = deviceId;
            cleanupCharts();
            await loadDeviceHistory(deviceId);
        }

        function getLastUpdateTime(deviceId) {
            return devices.value[deviceId]?.lastUpdate || 'N/A';
        }

        function reconnect() {
            connectMQTT();
        }

        onMounted(() => {
            if (isAuthenticated.value) {
                connectMQTT();
                // Clean up data older than 7 days
                dbService.clearOldData(7).catch(console.error);
            }
        });

        onUnmounted(() => {
            cleanupCharts();
            if (client.value) {
                client.value.end(true);
            }
        });

        return {
            isAuthenticated,
            username,
            password,
            loginError,
            login,
            logout,
            connectionStatus,
            connectionStatusClass,
            connectionError,
            messages,
            devices,
            deviceList,
            selectedDevice,
            currentDeviceData,
            selectDevice,
            getLastUpdateTime,
            reconnect
        };
    }
}).mount('#app');
