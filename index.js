let config = {
    numFloors: 0,
    numLifts: 0,
    liftWidth: 50,
    buildingWidth: 300,
    floorHeight: 150,
    doorOpenDuration: 2500,
    maxLiftsPerFloor: 2,
    liftSpeed: 2
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
            <div class="buttons">
                ${i === config.numFloors ? '' : '<button class="call-btn" data-direction="up"><i class="fas fa-chevron-up"></i></button>'}
                <div class="floor-number">
                ${i}
                </div>
                ${i === 1 ? '' : '<button class="call-btn" data-direction="down"><i class="fas fa-chevron-down"></i></button>'}
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
            <div class="lift-interior">
                <div class="lift-indicator">
                    <div class="direction-indicator"></div>
                    <div class="floor-display">1</div>
                </div>
            </div>
        `;
        lift.style.left = `${60 + i * (config.liftWidth + 20)}px`;
        lift.style.bottom = '0px';
        building.appendChild(lift);

        lifts.push({
            element: lift,
            currentFloor: 1,
            isMoving: false,
            isDoorsOpen: false,
            status: 'idle',
            pendingRequests: []
        });
    }

    floorLiftCounts[1] = config.numLifts;

    building.style.height = `${config.floorHeight * config.numFloors}px`;
    building.style.width = `${config.buildingWidth + (config.numLifts - 1) * (config.liftWidth + 10)}px`;

    addEventListeners();
    setInterval(dispatchLifts, 100);
}

function callLift(floorNum, direction) {
    const existingCall = callQueue.find(call => call.floorNum === floorNum && call.direction === direction);
    if (!existingCall) {
        const liftsOnFloor = lifts.filter(lift => lift.currentFloor === floorNum && !lift.isMoving);
        if (liftsOnFloor.length > 0) {
            // If there's already a lift on the floor, open its doors
            openLiftDoors(liftsOnFloor[0]);
            setTimeout(() => closeLiftDoors(liftsOnFloor[0]), config.doorOpenDuration);
        } else {
            callQueue.push({ floorNum, direction });
        }
    }
}

function dispatchLifts() {
    if (callQueue.length === 0) return;

    const { floorNum, direction } = callQueue[0];

    const availableLifts = lifts.filter(lift => 
        !lift.isMoving && !lift.isDoorsOpen && lift.pendingRequests.length === 0
    );

    if (availableLifts.length === 0) return; 

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
    }else {
        // If no lift can move to the target floor, remove the call from the queue
        console.log(`Cannot dispatch lift to floor ${floorNum}. Removing call from queue.`);
        callQueue.shift();
    }
}

function canMoveLiftToFloor(lift, targetFloor) {
    if (targetFloor === 1) return true; // First floor has no limit
    if (lift.currentFloor === targetFloor) return true; // Lift is already on the target floor
    return floorLiftCounts[targetFloor] < config.maxLiftsPerFloor;
}

function moveLift(lift, targetFloor) {
    lift.isMoving = true;
    updateLiftStatus(lift, 'moving');

    floorLiftCounts[lift.currentFloor]--;
    floorLiftCounts[targetFloor]++;

    const distance = (targetFloor - 1) * config.floorHeight;
    const duration = Math.abs(targetFloor - lift.currentFloor) * config.liftSpeed;

    lift.element.style.transition = `bottom ${duration}s ease-in-out`;

    const direction = targetFloor > lift.currentFloor ? 'up' : 'down';
    updateDirectionIndicator(lift, direction);

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
            lift.element.querySelector('.floor-display').textContent = currentFloor;
            frame++;
            requestAnimationFrame(updateFloorIndicator);
        }
    }
    updateFloorIndicator();

    setTimeout(() => {
        lift.currentFloor = targetFloor;
        lift.isMoving = false;
        lift.element.querySelector('.floor-display').textContent = targetFloor;
        updateDirectionIndicator(lift, 'idle');
        openLiftDoors(lift);

        setTimeout(() => {
            closeLiftDoors(lift);
            updateLiftStatus(lift, 'idle');
            handlePendingRequests(lift);
        }, config.doorOpenDuration);

    }, duration * 1000);

}

function updateDirectionIndicator(lift, direction) {
    const indicator = lift.element.querySelector('.direction-indicator');
    indicator.textContent = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';
    indicator.classList.toggle('blinking', direction !== 'idle');
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

function addEventListeners() {
    document.querySelectorAll('.call-btn').forEach(button => {
        button.addEventListener('click', function() {
            const floor = parseInt(this.closest('.floor').getAttribute('data-floor'));
            const direction = this.getAttribute('data-direction');
            callLift(floor, direction);
        });
    });
}

function updateLiftDisplay(lift) {
    const floorDisplay = lift.element.querySelector('.floor-display');
    floorDisplay.textContent = lift.currentFloor;
}
