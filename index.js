let config = {
    numFloors: 0,
    numLifts: 0,
    floorHeight: 65,
    liftWidth: 40,
    buildingWidth: 300
};

let lifts = [];
let callQueue = [];

function startSimulation() {
    config.numFloors = parseInt(document.getElementById('num-floors').value);
    config.numLifts = parseInt(document.getElementById('num-lifts').value);

    if (config.numFloors < 2 || config.numLifts < 1) {
        alert('Please enter valid numbers (at least 2 floors and 1 lift)');
        return;
    }

    // Hide configuration page, show simulation page
    document.getElementById('config-page').style.display = 'none';
    document.getElementById('simulation-page').style.display = 'flex';

    initializeSimulation();
}

function initializeSimulation() {
    const building = document.getElementById('building');
    building.innerHTML = ''; // Clear previous simulation
    lifts = [];
    callQueue = [];

    // Create floors
    for (let i = 1; i <= config.numFloors; i++) {
        const floor = document.createElement('div');
        floor.className = 'floor';
        floor.innerHTML = `
            <span>Floor ${i}</span>
            <button onclick="callLift(${i})">Call</button>
        `;
        building.appendChild(floor);
    }

    // Create lifts
    for (let i = 0; i < config.numLifts; i++) {
        const lift = document.createElement('div');
        lift.className = 'lift';
        lift.textContent = i + 1;
        lift.style.bottom = '10px';
        lift.style.left = `${10 + i * (config.liftWidth + 10)}px`;
        building.appendChild(lift);

        lifts.push({
            element: lift,
            currentFloor: 1,
            isMoving: false
        });
    }

    // Adjust building size
    building.style.width = `${config.buildingWidth + (config.numLifts - 1) * (config.liftWidth + 10)}px`;

    // Start the lift dispatch loop
    setInterval(dispatchLifts, 500);
}

function callLift(floorNum) {
    callQueue.push(floorNum);
}

function dispatchLifts() {
    if (callQueue.length === 0) return;

    // Find the nearest available lift
    const nearestLift = lifts.reduce((nearest, lift) => {
        if (lift.isMoving) return nearest;
        const distance = Math.abs(lift.currentFloor - callQueue[0]);
        if (!nearest || distance < Math.abs(nearest.currentFloor - callQueue[0])) {
            return lift;
        }
        return nearest;
    }, null);

    if (nearestLift) {
        nearestLift.isMoving = true;
        const distance = (callQueue[0] - nearestLift.currentFloor) * config.floorHeight;
        nearestLift.element.style.bottom = `${10 + distance}px`;
        nearestLift.element.textContent = callQueue[0];

        setTimeout(() => {
            nearestLift.currentFloor = callQueue[0];
            nearestLift.isMoving = false;
            callQueue.shift(); // Remove the handled call from the queue
        }, 500);
    }
}