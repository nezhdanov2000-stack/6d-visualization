const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

// Dataset
const data = window.apartmentsData || [];
document.getElementById('pt-count').innerText = data.length;

// Keys for normalization
const keys = ['area', 'price', 'dist', 'floor', 'year', 'rooms'];
const ranges = {};

keys.forEach(key => {
    let min = Infinity;
    let max = -Infinity;
    data.forEach(d => {
        if (d[key] < min) min = d[key];
        if (d[key] > max) max = d[key];
    });
    if (min === max) { min -= 1; max += 1; }
    ranges[key] = { min, max, span: max - min };
});

function normalize(value, key) {
    return (value - ranges[key].min) / ranges[key].span;
}

// Selectors
const selects = ['x', 'y', 'z', 'r', 'g', 'b'].map(k => document.getElementById(`map-${k}`));
selects.forEach(sel => sel.addEventListener('change', render));

// Toggles
const toggles = ['r', 'g', 'b'].map(k => document.getElementById(`toggle-${k}`));
toggles.forEach(tog => tog.addEventListener('change', render));

// Clipping
const toggleClip = document.getElementById('toggle-clip');
const clipDepthSlider = document.getElementById('clip-depth');
const clipDepthVal = document.getElementById('clip-depth-val');
toggleClip.addEventListener('change', render);
clipDepthSlider.addEventListener('input', () => {
    clipDepthVal.innerText = clipDepthSlider.value + '%';
    render();
});

// 3D Camera/Viewing settings
const camera = {
    yaw: 0.5,   // Rotation around Y axis
    pitch: 0.4, // Rotation around X axis
    zoom: 350
};

let drawnPoints = []; 

// 3D Math
function rotate3D(x, y, z) {
    // 1. Rotate Yaw (around Y axis)
    let x1 = x * Math.cos(camera.yaw) + z * Math.sin(camera.yaw);
    let y1 = y;
    let z1 = -x * Math.sin(camera.yaw) + z * Math.cos(camera.yaw);
    
    // 2. Rotate Pitch (around X axis)
    let x2 = x1;
    let y2 = y1 * Math.cos(camera.pitch) - z1 * Math.sin(camera.pitch);
    let z2 = y1 * Math.sin(camera.pitch) + z1 * Math.cos(camera.pitch);

    return { x: x2, y: y2, z: z2 };
}

function project(nx, ny, nz) {
    // Center inputs from [0, 1] to [-0.5, 0.5]
    let x = nx - 0.5;
    let y = ny - 0.5;
    let z = nz - 0.5;

    let rot = rotate3D(x, y, z);
    
    let cx = canvas.width / 2;
    let cy = canvas.height / 2;

    // Projected coordinates (Orthographic)
    let screenX = cx + rot.x * camera.zoom;
    let screenY = cy - rot.y * camera.zoom; // -y because canvas Y goes down

    return { screenX, screenY, depth: rot.z }; // return depth for z-sorting
}

function drawAxes() {
    let o = project(0, 0, 0); // Origin (-0.5)
    let px = project(1, 0, 0);
    let py = project(0, 1, 0);
    let pz = project(0, 0, 1);

    ctx.lineWidth = 2;
    // X Axis
    ctx.beginPath(); ctx.moveTo(o.screenX, o.screenY); ctx.lineTo(px.screenX, px.screenY);
    ctx.strokeStyle = "rgba(255, 100, 100, 0.8)"; ctx.stroke();
    // Y Axis
    ctx.beginPath(); ctx.moveTo(o.screenX, o.screenY); ctx.lineTo(py.screenX, py.screenY);
    ctx.strokeStyle = "rgba(100, 255, 100, 0.8)"; ctx.stroke();
    // Z Axis
    ctx.beginPath(); ctx.moveTo(o.screenX, o.screenY); ctx.lineTo(pz.screenX, pz.screenY);
    ctx.strokeStyle = "rgba(100, 100, 255, 0.8)"; ctx.stroke();

    // Box wireframe
    let pxy = project(1, 1, 0); let pxz = project(1, 0, 1); let pyz = project(0, 1, 1); let pxyz = project(1, 1, 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(px.screenX, px.screenY); ctx.lineTo(pxz.screenX, pxz.screenY); ctx.lineTo(pz.screenX, pz.screenY);
    ctx.moveTo(pxz.screenX, pxz.screenY); ctx.lineTo(pxyz.screenX, pxyz.screenY);
    ctx.moveTo(px.screenX, px.screenY); ctx.lineTo(pxy.screenX, pxy.screenY);
    ctx.moveTo(pz.screenX, pz.screenY); ctx.lineTo(pyz.screenX, pyz.screenY);
    ctx.moveTo(py.screenX, py.screenY); ctx.lineTo(pxy.screenX, pxy.screenY); ctx.lineTo(pxyz.screenX, pxyz.screenY);
    ctx.lineTo(pyz.screenX, pyz.screenY); ctx.lineTo(py.screenX, py.screenY);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`${selects[0].options[selects[0].selectedIndex].text} (X)`, px.screenX + 5, px.screenY);
    ctx.fillText(`${selects[1].options[selects[1].selectedIndex].text} (Y)`, py.screenX, py.screenY - 10);
    ctx.fillText(`${selects[2].options[selects[2].selectedIndex].text} (Z)`, pz.screenX + 5, pz.screenY + 15);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let keyX = selects[0].value; let keyY = selects[1].value; let keyZ = selects[2].value;
    let keyR = selects[3].value; let keyG = selects[4].value; let keyB = selects[5].value;

    let useR = toggles[0].checked;
    let useG = toggles[1].checked;
    let useB = toggles[2].checked;

    let clipEnabled = toggleClip.checked;
    let clipThreshold = parseInt(clipDepthSlider.value) / 100;

    // Process all points, project them, calculate depth
    drawnPoints = [];
    data.forEach(point => {
        let nx = normalize(point[keyX], keyX);
        let ny = normalize(point[keyY], keyY);
        let nz = normalize(point[keyZ], keyZ);

        let proj = project(nx, ny, nz);

        // Clipping: cut off points that are closer to the camera (higher depth) than the threshold
        if (clipEnabled && proj.depth > clipThreshold) return;

        let r = useR ? Math.round(normalize(point[keyR], keyR) * 255) : 0;
        let g = useG ? Math.round(normalize(point[keyG], keyG) * 255) : 0;
        let b = useB ? Math.round(normalize(point[keyB], keyB) * 255) : 0;

        drawnPoints.push({
            screenX: proj.screenX,
            screenY: proj.screenY,
            depth: proj.depth,
            r, g, b, data: point
        });
    });

    // Sort by depth (painters algorithm) - render furthest first (~lowest Z in our rotation)
    drawnPoints.sort((a, b) => a.depth - b.depth);

    // Draw axes & wireframe - ideally this sits around depth = 0
    drawAxes();

    for (let p of drawnPoints) {
        ctx.beginPath();
        // size varies slightly by depth for better 3D feel
        let size = Math.max(1, 3.5 + p.depth * 2); 
        ctx.arc(p.screenX, p.screenY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, 0.9)`;
        ctx.fill();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = `rgba(0,0,0,0.6)`;
        ctx.stroke();
    }
}

// Interactivity: Drag to Rotate
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    canvas.style.cursor = 'move';
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        let dx = e.clientX - lastMouse.x;
        let dy = e.clientY - lastMouse.y;
        
        camera.yaw += dx * 0.01;
        camera.pitch += dy * 0.01;

        // Clamp pitch to avoid flipping over completely (optional, but good for stability)
        camera.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.pitch));

        lastMouse.x = e.clientX;
        lastMouse.y = e.clientY;
        
        requestAnimationFrame(render);
        tooltip.style.opacity = 0; // hide tooltip while rotating
    } else {
        // Tooltip logic
        let rect = canvas.getBoundingClientRect();
        let mx = e.clientX - rect.left;
        let my = e.clientY - rect.top;

        let hit = null;
        let minDist = 6;
        
        for (let i = drawnPoints.length - 1; i >= 0; i--) {
            let p = drawnPoints[i];
            let dx = mx - p.screenX;
            let dy = my - p.screenY;
            if (Math.hypot(dx, dy) < minDist) {
                hit = p;
                break;
            }
        }

        if (hit) {
            tooltip.style.opacity = 1;
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
            
            let d = hit.data;
            tooltip.innerHTML = `
                <div class="tooltip-row">Area: <span>${d.area} sqm</span></div>
                <div class="tooltip-row">Price: <span>$${d.price}</span></div>
                <div class="tooltip-row">Dist: <span>${d.dist.toFixed(1)} km</span></div>
                <div class="tooltip-row">Floor: <span>${d.floor}</span></div>
                <div class="tooltip-row">Year: <span>${d.year}</span></div>
                <div class="tooltip-row">Rooms: <span>${d.rooms}</span></div>
            `;
            canvas.style.cursor = 'pointer';
        } else {
            tooltip.style.opacity = 0;
            canvas.style.cursor = 'crosshair';
        }
    }
});

// Interactivity: Scroll to Zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); // prevent page scroll
    let zoomFactor = -e.deltaY * 0.5;
    camera.zoom += zoomFactor;
    if (camera.zoom < 50) camera.zoom = 50; // min zoom
    if (camera.zoom > 2000) camera.zoom = 2000; // max zoom
    requestAnimationFrame(render);
}, { passive: false });

window.addEventListener('mouseleave', () => {
    tooltip.style.opacity = 0;
});

// Initial render
requestAnimationFrame(render);
