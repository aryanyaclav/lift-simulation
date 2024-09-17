let config = {
    numFloors: 0,
    numLifts: 0,
    liftWidth: 40,
    buildingWidth: 300,
    floorHeight: 100,
    doorOpenDuration: 2500,
    liftCapacity: 8,
    maxLiftsPerFloor: 2
};

let lifts = [];
let callQueue = [];
let floorLiftCounts = {};

function startSimulation() {
    config.numFloors = parseInt(document.getElementById('num-floors').value);
    config.numLifts = parseInt(document.getElementById('num-lifts').value);

    if (config.numFloors < 2 || config.numLifts < 1) {
        alert('Please enter valid numbers (at least 2 floors and 1 lift)');
        return;
    }

    document.getElementById('config-page').style.display = 'none';
    document.getElementById('simulation-page').style.display = 'flex';

    initializeSimulation();
}

function initializeSimulation() {
    const building = document.getElementById('building');
    building.innerHTML = '';
    lifts = [];
    callQueue = [];
    floorLiftCounts = {};

    for (let i = 1; i <= config.numFloors; i++) {
        floorLiftCounts[i] = 0;
    }

    for (let i = config.numFloors; i >= 1; i--) {
        const floor = document.createElement('div');
        floor.className = 'floor';
        floor.setAttribute('data-floor', i);
        floor.innerHTML = `
            <span class="floor-number">Floor ${i}</span>
            <div class="buttons">
                <button class="call-btn" data-direction="up">Up</button>
                <button class="call-btn" data-direction="down">Down</button>
            </div>
        `;
        building.appendChild(floor);
    }

    for (let i = 0; i < config.numLifts; i++) {
        const lift = document.createElement('div');
        lift.className = 'lift';
        lift.innerHTML = `
            <div class="lift-doors">
                <div class="door door-left"></div>
                <div class="door door-right"></div>
            </div>
            <div class="passenger-count">0</div>
            <div class="floor-indicator">1</div>
        `;
        lift.style.left = `${10 + i * (config.liftWidth + 10)}px`;
        lift.style.bottom = '0px';
        building.appendChild(lift);

        lifts.push({
            element: lift,
            currentFloor: 1,
            isMoving: false,
            isDoorsOpen: false,
            passengers: [],
            status: 'idle',
            pendingRequests: []
        });
    }

    floorLiftCounts[1] = config.numLifts;

    building.style.height = `${config.floorHeight * config.numFloors}px`;
    building.style.width = `${config.buildingWidth + (config.numLifts - 1) * (config.liftWidth + 10)}px`;

    setInterval(dispatchLifts, 100);
}

function callLift(floorNum, direction) {
    const existingCall = callQueue.find(call => call.floorNum === floorNum && call.direction === direction);
    if (!existingCall) {
        callQueue.push({ floorNum, direction });
    }
}

function dispatchLifts() {
    if (callQueue.length === 0) return;

    const { floorNum, direction } = callQueue[0];

    const availableLifts = lifts.filter(lift => 
        !lift.isMoving && !lift.isDoorsOpen && lift.pendingRequests.length === 0
    );

    if (availableLifts.length === 0) return; // All lifts are busy

    const bestLift = availableLifts.reduce((best, lift) => {
        const distance = Math.abs(lift.currentFloor - floorNum);
        const score = distance;

        if (!best || score < best.score) {
            return { lift, score };
        }
        return best;
    }, null);

    if (bestLift && canMoveLiftToFloor(bestLift.lift, floorNum)) {
        moveLift(bestLift.lift, floorNum);
        callQueue.shift();
    }
}

function canMoveLiftToFloor(lift, targetFloor) {
    if (targetFloor === 1) return true; // First floor has no limit
    return floorLiftCounts[targetFloor] < config.maxLiftsPerFloor;
}

function moveLift(lift, targetFloor) {
    lift.isMoving = true;
    updateLiftStatus(lift, 'moving');

    floorLiftCounts[lift.currentFloor]--;
    floorLiftCounts[targetFloor]++;

    const distance = (targetFloor - 1) * config.floorHeight;
    const duration = Math.abs(targetFloor - lift.currentFloor);

    lift.element.style.transition = `bottom ${duration}s ease-in-out`;

    requestAnimationFrame(() => {
        lift.element.style.bottom = `${distance}px`;
    });

    const startFloor = lift.currentFloor;
    const totalFrames = duration * 60;
    let frame = 0;

    function updateFloorIndicator() {
        if (frame <= totalFrames) {
            const progress = frame / totalFrames;
            const currentFloor = Math.round(startFloor + (targetFloor - startFloor) * progress);
            lift.element.querySelector('.floor-indicator').textContent = currentFloor;
            frame++;
            requestAnimationFrame(updateFloorIndicator);
        }
    }
    updateFloorIndicator();

    setTimeout(() => {
        lift.currentFloor = targetFloor;
        lift.isMoving = false;
        lift.element.querySelector('.floor-indicator').textContent = targetFloor;
        openLiftDoors(lift);

        setTimeout(() => {
            closeLiftDoors(lift);
            updateLiftStatus(lift, 'idle');
            handlePendingRequests(lift);
        }, config.doorOpenDuration);

    }, duration * 1000);
}

function handlePendingRequests(lift) {
    if (callQueue.length > 0) {
        const nextCall = callQueue[0];
        if (canMoveLiftToFloor(lift, nextCall.floorNum)) {
            moveLift(lift, nextCall.floorNum);
            callQueue.shift();
        }
    }
}

function openLiftDoors(lift) {
    lift.isDoorsOpen = true;
    updateLiftStatus(lift, 'doors-opening');
    const doors = lift.element.querySelectorAll('.door');
    doors.forEach(door => door.classList.add('open'));
}

function closeLiftDoors(lift) {
    updateLiftStatus(lift, 'doors-closing');
    const doors = lift.element.querySelectorAll('.door');
    doors.forEach(door => door.classList.remove('open'));
    lift.isDoorsOpen = false;
}

function updateLiftStatus(lift, status) {
    lift.status = status;
    lift.element.setAttribute('data-status', status);
}

function addPassengerToLift(lift, destinationFloor) {
    if (lift.passengers.length < config.liftCapacity) {
        lift.passengers.push(destinationFloor);
        updateLiftDisplay(lift);
    }
}

function updateLiftDisplay(lift) {
    lift.element.querySelector('.passenger-count').textContent = lift.passengers.length;
}

function emergencyStop(lift) {
    lift.isMoving = false;
    lift.element.style.transition = 'none';
    updateLiftStatus(lift, 'emergency');
}

document.getElementById('building').addEventListener('click', (e) => {
    if (e.target.classList.contains('call-btn')) {
        const floor = parseInt(e.target.closest('.floor').getAttribute('data-floor'));
        const direction = e.target.getAttribute('data-direction');
        callLift(floor, direction);
    }
});