const canvas = document.getElementById('graph1d');
const ctx = canvas.getContext('2d');
const solutionBox = document.getElementById('solution-box');

// RGB Cube Background Cache
const rgbBgCanvas = document.createElement('canvas');
rgbBgCanvas.width = 400;
rgbBgCanvas.height = 350;
const rgbBgCtx = rgbBgCanvas.getContext('2d');
let rgbBgFullyRendered = false;

function getCubeProj(rN, gN, bN) {
    const size = 120;
    const cx = 200;
    const cy = 200;

    // Проекция 3D (R,G,B) в 2D изометрию
    let x = cx + (gN - rN) * size * 0.866;
    let y = cy + (rN + gN) * size * 0.45 - bN * size;

    // Z-значение для Painter's алгоритма. 
    // Инвертировано: теперь самая светлая точка (1,1,1) имеет максимальный Z и рисуется "впереди".
    let z = (rN + gN + bN);
    return { x, y, z };
}

function initRGBCubeBG() {
    const w = rgbBgCanvas.width;
    const h = rgbBgCanvas.height;
    const imgData = rgbBgCtx.createImageData(w, h);
    const buf = new Uint32Array(imgData.data.buffer);
    const zBuf = new Float32Array(w * h);
    for (let i = 0; i < zBuf.length; i++) zBuf[i] = -9999;

    function drawFace(fixedAxis, fixedVal) {
        // Итерация по 2 оставшимся осям
        for (let u = 0; u <= 1.0; u += 0.005) {
            for (let v = 0; v <= 1.0; v += 0.005) {
                let rN, gN, bN;
                if (fixedAxis === 'r') { rN = fixedVal; gN = u; bN = v; }
                else if (fixedAxis === 'g') { gN = fixedVal; rN = u; bN = v; }
                else if (fixedAxis === 'b') { bN = fixedVal; rN = u; gN = v; }

                let p = getCubeProj(rN, gN, bN);
                let px = Math.floor(p.x);
                let py = Math.floor(p.y);

                if (px >= 0 && px < w && py >= 0 && py < h) {
                    let idx = py * w + px;
                    if (p.z > zBuf[idx]) {
                        zBuf[idx] = p.z;
                        let r = Math.round(rN * 255);
                        let g = Math.round(gN * 255);
                        let b = Math.round(bN * 255);
                        // Формат ABGR
                        buf[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
                    }
                }
            }
        }
    }

    // Закрашиваем 6 граней
    drawFace('r', 0); drawFace('r', 1);
    drawFace('g', 0); drawFace('g', 1);
    drawFace('b', 0); drawFace('b', 1);

    rgbBgCtx.putImageData(imgData, 0, 0);

    // Обводка ребер куба (видимая часть)
    let pW = getCubeProj(1, 1, 1);
    let pY = getCubeProj(1, 1, 0);
    let pC = getCubeProj(0, 1, 1);
    let pM = getCubeProj(1, 0, 1);
    let pR_corner = getCubeProj(1, 0, 0);
    let pG_corner = getCubeProj(0, 1, 0);
    let pB_corner = getCubeProj(0, 0, 1);

    // Тёмная полупрозрачная обводка отлично подчеркивает объем светящегося куба
    rgbBgCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    rgbBgCtx.lineWidth = 1.5;
    rgbBgCtx.lineJoin = 'round';
    rgbBgCtx.beginPath();

    // Внутренние грани (соединяющие ближайший белый угол)
    rgbBgCtx.moveTo(pW.x, pW.y); rgbBgCtx.lineTo(pY.x, pY.y);
    rgbBgCtx.moveTo(pW.x, pW.y); rgbBgCtx.lineTo(pC.x, pC.y);
    rgbBgCtx.moveTo(pW.x, pW.y); rgbBgCtx.lineTo(pM.x, pM.y);

    // Внешний контур шестиугольника
    rgbBgCtx.moveTo(pY.x, pY.y); rgbBgCtx.lineTo(pR_corner.x, pR_corner.y);
    rgbBgCtx.lineTo(pM.x, pM.y); rgbBgCtx.lineTo(pB_corner.x, pB_corner.y);
    rgbBgCtx.lineTo(pC.x, pC.y); rgbBgCtx.lineTo(pG_corner.x, pG_corner.y);
    rgbBgCtx.lineTo(pY.x, pY.y);
    rgbBgCtx.stroke();

    // Text drawing moved out to support dynamic labels

    // Линии осей (более отчетливые, пунктирные)
    rgbBgCtx.strokeStyle = 'rgba(255,255,255,0.4)';
    rgbBgCtx.lineWidth = 1.5;
    rgbBgCtx.setLineDash([4, 4]);
    rgbBgCtx.beginPath();
    let c0 = getCubeProj(0, 0, 0);
    let cRLine = getCubeProj(1.18, 0, 0);
    let cGLine = getCubeProj(0, 1.18, 0);
    let cBLine = getCubeProj(0, 0, 1.18);

    rgbBgCtx.moveTo(c0.x, c0.y); rgbBgCtx.lineTo(cRLine.x, cRLine.y);
    rgbBgCtx.moveTo(c0.x, c0.y); rgbBgCtx.lineTo(cGLine.x, cGLine.y);
    rgbBgCtx.moveTo(c0.x, c0.y); rgbBgCtx.lineTo(cBLine.x, cBLine.y);
    rgbBgCtx.stroke();

    rgbBgCtx.setLineDash([]); // Сборс пунктира для безопасности

    rgbBgFullyRendered = true;
}

function drawRGBMarker(yV, zV, wV, yMin, yMax, zMin, zMax, wMin, wMax) {
    const rgbCanvas = document.getElementById('rgbCube');
    if (!rgbCanvas) return;
    const ctx = rgbCanvas.getContext('2d');

    if (!rgbBgFullyRendered) return;

    ctx.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
    ctx.drawImage(rgbBgCanvas, 0, 0);

    let rN = (yMax <= yMin) ? 0 : (yV - yMin) / (yMax - yMin);
    let gN = (zMax <= zMin) ? 0 : (zV - zMin) / (zMax - zMin);
    let bN = (wMax <= wMin) ? 0 : (wV - wMin) / (wMax - wMin);

    let outOfBounds = (rN < 0 || rN > 1 || gN < 0 || gN > 1 || bN < 0 || bN > 1);
    let proj = getCubeProj(rN, gN, bN);

    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);

    if (outOfBounds) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2;
    } else {
        let pR = Math.min(255, Math.max(0, Math.round(rN * 255)));
        let pG = Math.min(255, Math.max(0, Math.round(gN * 255)));
        let pB = Math.min(255, Math.max(0, Math.round(bN * 255)));
        ctx.fillStyle = `rgb(${pR}, ${pG}, ${pB})`;
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
    }

    ctx.fill();
    ctx.stroke();

    // Сброс графики
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    drawRGBAxesText(ctx);

    // Текст значений
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Solution:`, 10, 20);
    ctx.fillStyle = outOfBounds ? '#ff9800' : '#fff';
    ctx.fillText(`${getVarName('rgb-r')} (R) = ${yV.toFixed(3)}`, 10, 40);
    ctx.fillText(`${getVarName('rgb-g')} (G) = ${zV.toFixed(3)}`, 10, 60);
    ctx.fillText(`${getVarName('rgb-b')} (B) = ${wV.toFixed(3)}`, 10, 80);
    if (outOfBounds) {
        ctx.fillText(`(Out of mapped bounds)`, 10, 100);
    }
}

// Monge Canvas Background Cache
const mongeBgCanvas = document.createElement('canvas');
mongeBgCanvas.width = 400;
mongeBgCanvas.height = 400;
const mongeBgCtx = mongeBgCanvas.getContext('2d');
let mongeBgFullyRendered = false;

function initMongeBG() {
    const w = mongeBgCanvas.width;
    const h = mongeBgCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const imgData = mongeBgCtx.createImageData(w, h);
    const buf = new Uint32Array(imgData.data.buffer);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            let r = 17, g = 17, b = 17; // base #111111

            if (px > cx && py <= cy) { // Top-Right (Frontal) Z-W (Green-Blue)
                let u = (px - cx) / (w - cx);
                let v = (cy - py) / cy;
                g = Math.round(u * 255);
                b = Math.round(v * 255);
                r = 0;
            } else if (px > cx && py > cy) { // Bottom-Right (Horizontal) Z-Y (Green-Red)
                let u = (px - cx) / (w - cx);
                let v = (py - cy) / (h - cy);
                g = Math.round(u * 255);
                r = Math.round(v * 255);
                b = 0;
            } else if (px <= cx && py <= cy) { // Top-Left (Profile) Y-W (Red-Blue)
                let u = (cx - px) / cx;
                let v = (cy - py) / cy;
                r = Math.round(u * 255);
                b = Math.round(v * 255);
                g = 0;
            }

            let idx = py * w + px;
            buf[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
    }
    mongeBgCtx.putImageData(imgData, 0, 0);

    // Оси
    mongeBgCtx.strokeStyle = 'rgba(255,255,255,0.4)';
    mongeBgCtx.lineWidth = 1;
    mongeBgCtx.beginPath();
    mongeBgCtx.moveTo(0, cy); mongeBgCtx.lineTo(w, cy); // Horizontal axis
    mongeBgCtx.moveTo(cx, 0); mongeBgCtx.lineTo(cx, h); // Vertical axis
    mongeBgCtx.stroke();

    // Text drawing moved out to support dynamic labels

    mongeBgFullyRendered = true;
}

function drawMongeMarker(yV, zV, wV, yMin, yMax, zMin, zMax, wMin, wMax) {
    const canvas = document.getElementById('mongeCanvas');
    if (!canvas || !mongeBgFullyRendered) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(mongeBgCanvas, 0, 0);
    drawMongeAxesText(ctx, w, h);

    let rN = (yMax <= yMin) ? 0 : (yV - yMin) / (yMax - yMin);
    let gN = (zMax <= zMin) ? 0 : (zV - zMin) / (zMax - zMin);
    let bN = (wMax <= wMin) ? 0 : (wV - wMin) / (wMax - wMin);

    let outOfBounds = (rN < 0 || rN > 1 || gN < 0 || gN > 1 || bN < 0 || bN > 1);

    // Координаты на холсте
    let px_Z_right = cx + gN * cx;
    let px_Y_left = cx - rN * cx;
    let py_Y_down = cy + rN * cy;
    let py_B_up = cy - bN * cy;

    // Точки-проекции
    let ptFrontal = { x: px_Z_right, y: py_B_up }; // Z-W (Top-Right)
    let ptHoriz = { x: px_Z_right, y: py_Y_down }; // Z-Y (Bottom-Right)
    let ptProfile = { x: px_Y_left, y: py_B_up };  // Y-W (Top-Left)

    // Линии связи
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();

    // Вертикальная линия (связь Z)
    ctx.moveTo(ptFrontal.x, ptFrontal.y);
    ctx.lineTo(ptHoriz.x, ptHoriz.y);

    // Горизонтальная линия (связь W)
    ctx.moveTo(ptFrontal.x, ptFrontal.y);
    ctx.lineTo(ptProfile.x, ptProfile.y);

    // Линии к осям Y
    ctx.moveTo(ptHoriz.x, ptHoriz.y);
    ctx.lineTo(cx, ptHoriz.y);

    ctx.moveTo(ptProfile.x, ptProfile.y);
    ctx.lineTo(ptProfile.x, cy);
    ctx.stroke();

    // Дуга переноса Y (в пустом квадранте)
    ctx.beginPath();
    let radius = Math.abs(rN * cx);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.setLineDash([2, 4]);
    let dir = (rN >= 0) ? 1 : -1;
    ctx.arc(cx, cy, radius, (dir > 0 ? Math.PI / 2 : -Math.PI / 2), (dir > 0 ? Math.PI : 0), false);
    ctx.stroke();

    // Рисуем маркеры
    function drawProjDot(pt, color) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        if (outOfBounds) {
            ctx.fillStyle = 'transparent';
            ctx.strokeStyle = '#ff9800';
            ctx.setLineDash([2, 2]);
        } else {
            ctx.fillStyle = color;
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([]);
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
        }
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    let pR = Math.min(255, Math.max(0, Math.round(rN * 255)));
    let pG = Math.min(255, Math.max(0, Math.round(gN * 255)));
    let pB = Math.min(255, Math.max(0, Math.round(bN * 255)));

    ctx.setLineDash([]);
    drawProjDot(ptFrontal, `rgb(0, ${pG}, ${pB})`);
    drawProjDot(ptHoriz, `rgb(${pR}, ${pG}, 0)`);
    drawProjDot(ptProfile, `rgb(${pR}, 0, ${pB})`);
}

// Функция отрисовки 2D градиентов для IK
function draw2DLegend(canvasId) {
    let cvs = document.getElementById(canvasId);
    if (!cvs) return;
    let ctx = cvs.getContext('2d');
    let w = cvs.width;
    let h = cvs.height;

    let imgData = ctx.createImageData(w, h);
    let buf = new Uint32Array(imgData.data.buffer);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            let gN = (h - 1 - py) / (h - 1);
            let rN = px / (w - 1);

            let r_col = Math.round(rN * 255);
            let g_col = Math.round(gN * 255);

            let idx = py * w + px;
            buf[idx] = (255 << 24) | (0 << 16) | (g_col << 8) | r_col;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// Функция отрисовки шкалы-легенды
function drawLegendAxis(canvasId, minStr, maxStr, colorEnd) {
    let min = parseFloat(minStr) || 0;
    let max = parseFloat(maxStr) || 0;
    let cvs = document.getElementById(canvasId);
    let ctx = cvs.getContext('2d');
    let w = cvs.width;
    let h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    let grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(1, colorEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 10);

    let range = max - min;
    if (range <= 0) return;

    let step = 1;
    if (range > 60) step = 10;
    else if (range > 20) step = 5;
    else if (range > 10) step = 2;

    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    let startVal = Math.ceil(min / step) * step;
    for (let val = startVal; val <= max; val += step) {
        let px = ((val - min) / range) * w;

        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.floor(px), 10, 1, 3);

        ctx.fillStyle = '#aaa';
        let txtW = ctx.measureText(val.toString()).width;
        if (px >= txtW / 2 && px <= w - txtW / 2) {
            ctx.fillText(val.toString(), px, 23);
        }
    }
}

const inputs = document.querySelectorAll('.sidebar input, .axis-select, #ik-error-intensity');
inputs.forEach(el => el.addEventListener('input', drawAll));
inputs.forEach(el => el.addEventListener('change', drawAll));

function getVal(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

function getAxis(id) {
    let el = document.getElementById(id);
    if (!el) return 0;
    return parseInt(el.value);
}

function getVarName(id) {
    const legendNames = ['X', 'Y', 'Z', 'W'];
    return legendNames[getAxis(id)];
}

function drawRGBAxesText(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px sans-serif';
    let pR = getCubeProj(1.2, 0, 0);
    ctx.fillText(getVarName('rgb-r') + " (Red)", pR.x - 20, pR.y + 15);
    let pG = getCubeProj(0, 1.2, 0);
    ctx.fillText(getVarName('rgb-g') + " (Green)", pG.x, pG.y + 15);
    let pB = getCubeProj(0, 0, 1.2);
    ctx.fillText(getVarName('rgb-b') + " (Blue)", pB.x - 15, pB.y);
}

function drawMongeAxesText(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(getVarName('monge-g') + " (Green)", w - 35, cy - 8);
    ctx.fillText(getVarName('monge-b') + " (Blue)", cx + 30, 20);
    ctx.fillText(getVarName('monge-r') + " (Red)", cx + 30, h - 10);
    ctx.fillText(getVarName('monge-r') + " (Red)", 35, cy - 8);
}

function getDom(axisIdx) {
    if (axisIdx === 0) return { min: getVal('xmin'), max: getVal('xmax') };
    if (axisIdx === 1) return { min: getVal('ymin'), max: getVal('ymax') };
    if (axisIdx === 2) return { min: getVal('zmin'), max: getVal('zmax') };
    if (axisIdx === 3) return { min: getVal('wmin'), max: getVal('wmax') };
    return { min: -2, max: 6 };
}

function mapValue(val, min, max) {
    if (max <= min) return 0;
    let t = (val - min) / (max - min);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return Math.round(t * 255);
}

// Решение методом Гаусса N x N
function gaussSolve(M_orig, V_orig) {
    let M = M_orig.map(r => r.slice());
    let V = V_orig.slice();
    let N = M.length;

    for (let i = 0; i < N; i++) {
        let maxRow = i;
        for (let j = i + 1; j < N; j++) {
            if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) maxRow = j;
        }

        // Swap rows
        let tempM = M[i]; M[i] = M[maxRow]; M[maxRow] = tempM;
        let tempV = V[i]; V[i] = V[maxRow]; V[maxRow] = tempV;

        if (Math.abs(M[i][i]) < 1e-9) return null;

        for (let j = i + 1; j < N; j++) {
            let f = M[j][i] / M[i][i];
            for (let k = i; k < N; k++) M[j][k] -= f * M[i][k];
            V[j] -= f * V[i];
        }
    }

    let ans = [];
    for (let i = N - 1; i >= 0; i--) {
        ans[i] = V[i];
        for (let j = i + 1; j < N; j++) ans[i] -= M[i][j] * ans[j];
        ans[i] /= M[i][i];
    }
    return ans;
}

function drawAll() {
    if (window.initIKBackground) window.initIKBackground();

    // Equations: A*X + B*Y + C*Z + D*W = E
    const eq = [
        [getVal('a1'), getVal('b1'), getVal('c1'), getVal('d1'), getVal('e1')],
        [getVal('a2'), getVal('b2'), getVal('c2'), getVal('d2'), getVal('e2')],
        [getVal('a3'), getVal('b3'), getVal('c3'), getVal('d3'), getVal('e3')],
        [getVal('a4'), getVal('b4'), getVal('c4'), getVal('d4'), getVal('e4')]
    ];

    let gAxis = getAxis('graph-x');
    let gDoms = getDom(gAxis);
    const gxMin = gDoms.min;
    const gxMax = gDoms.max;

    let remG = [0, 1, 2, 3].filter(a => a !== gAxis);
    if (remG.length < 3) remG = [0, 1, 2].map(x => x === gAxis ? 3 : x); // Fallback to avoid out of bounds

    let domR = getDom(remG[0]);
    let domG = getDom(remG[1]);
    let domB = getDom(remG[2]);

    // Draw Legends
    const legendNames = ['X', 'Y', 'Z', 'W'];
    drawLegendAxis('legend-y', domR.min, domR.max, '#ff0000');
    drawLegendAxis('legend-z', domG.min, domG.max, '#00ff00');
    drawLegendAxis('legend-w', domB.min, domB.max, '#0000ff');

    let labelR = document.querySelector('#legend-y').previousElementSibling;
    if (labelR) labelR.innerText = legendNames[remG[0]] + ' Intensity (Red)';
    let labelG = document.querySelector('#legend-z').previousElementSibling;
    if (labelG) labelG.innerText = legendNames[remG[1]] + ' Intensity (Green)';
    let labelB = document.querySelector('#legend-w').previousElementSibling;
    if (labelB) labelB.innerText = legendNames[remG[2]] + ' Intensity (Blue)';

    // Analytical Solver
    let M4 = [
        [eq[0][0], eq[0][1], eq[0][2], eq[0][3]],
        [eq[1][0], eq[1][1], eq[1][2], eq[1][3]],
        [eq[2][0], eq[2][1], eq[2][2], eq[2][3]],
        [eq[3][0], eq[3][1], eq[3][2], eq[3][3]]
    ];
    let V4 = [eq[0][4], eq[1][4], eq[2][4], eq[3][4]];
    let sol4 = gaussSolve(M4, V4);

    let targetVal = null;
    if (sol4) {
        targetVal = sol4[gAxis];
        solutionBox.innerHTML = `Direct Solution found!<br> <b>[ X=${sol4[0].toFixed(3)}, Y=${sol4[1].toFixed(3)}, Z=${sol4[2].toFixed(3)}, W=${sol4[3].toFixed(3)} ]</b>`;
        solutionBox.style.color = '#0f0';
        solutionBox.style.borderColor = 'rgba(15, 255, 0, 0.3)';

        // Snap IK target to the exact solution if not dragging
        let ikCvs = document.getElementById('ikCanvas');
        if (ikCvs && ikCvs.dataset.isDragging !== 'true') {
            let ikXId = getAxis('ik-x'); let domX = getDom(ikXId);
            let ikYId = getAxis('ik-y'); let domY = getDom(ikYId);
            let w = ikCvs.width;
            let h = ikCvs.height;
            let px = ((sol4[ikXId] - domX.min) / (domX.max - domX.min)) * w;
            let py = h - ((sol4[ikYId] - domY.min) / (domY.max - domY.min)) * h;
            if (typeof ikTarget !== 'undefined') {
                ikTarget.x = px;
                ikTarget.y = py;
                ikTension = 0; // Valid analytical solution has 0 error
                if (window.drawIKOverlay) window.drawIKOverlay();
            }
        }
    } else {
        solutionBox.innerHTML = `Warning! Matrix is singular.<br>The system may not have a unique solution.`;
        solutionBox.style.color = '#ff9800';
        solutionBox.style.borderColor = 'rgba(255, 152, 0, 0.3)';
    }

    // Rendring 1D Stripes
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const sh = 40;
    const gap = 15;
    const startY = 20;

    const triplets = [
        { ids: [0, 1, 2], label: 'Intersection: Eqs 1, 2, 3', color: '#ccc' },
        { ids: [1, 2, 3], label: 'Intersection: Eqs 2, 3, 4', color: '#ccc' },
        { ids: [0, 2, 3], label: 'Intersection: Eqs 1, 3, 4', color: '#ccc' },
        { ids: [0, 1, 3], label: 'Intersection: Eqs 1, 2, 4', color: '#ccc' }
    ];

    // Render each strip
    for (let t = 0; t < 4; t++) {
        let stripTop = startY + t * (sh + gap);
        let ids = triplets[t].ids;

        for (let px = 0; px < w; px++) {
            let ValH = gxMin + (px / w) * (gxMax - gxMin);

            // For the given triplet, set up 3x3 matrix for remaining variables
            let M3 = [
                [eq[ids[0]][remG[0]], eq[ids[0]][remG[1]], eq[ids[0]][remG[2]]],
                [eq[ids[1]][remG[0]], eq[ids[1]][remG[1]], eq[ids[1]][remG[2]]],
                [eq[ids[2]][remG[0]], eq[ids[2]][remG[1]], eq[ids[2]][remG[2]]]
            ];
            let V3 = [
                eq[ids[0]][4] - eq[ids[0]][gAxis] * ValH,
                eq[ids[1]][4] - eq[ids[1]][gAxis] * ValH,
                eq[ids[2]][4] - eq[ids[2]][gAxis] * ValH
            ];

            let sol3 = gaussSolve(M3, V3);
            if (sol3) {
                let cR = mapValue(sol3[0], domR.min, domR.max);
                let cG = mapValue(sol3[1], domG.min, domG.max);
                let cB = mapValue(sol3[2], domB.min, domB.max);
                ctx.fillStyle = `rgb(${cR}, ${cG}, ${cB})`;
                ctx.fillRect(px, stripTop, 1, sh);
            } else {
                // Singular 3x3
                ctx.fillStyle = '#111';
                ctx.fillRect(px, stripTop, 1, sh);
            }
        }

        // Strip frame and label
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, stripTop, w, sh);

        ctx.fillStyle = triplets[t].color;
        ctx.font = '12px sans-serif';
        ctx.fillText(triplets[t].label, 10, stripTop - 5);
    }

    // Draw Bottom X Axis
    let bottomY = startY + 4 * (sh + gap) - gap + 5;
    ctx.fillStyle = '#666';
    ctx.fillRect(0, bottomY, w, 2);

    for (let i = 0; i <= Math.ceil(gxMax - gxMin); i++) {
        let mathVal = Math.floor(gxMin) + i;
        if (mathVal < gxMin || mathVal > gxMax) continue;

        let px = ((mathVal - gxMin) / (gxMax - gxMin)) * w;
        ctx.fillRect(px, bottomY - 5, 2, 10);

        ctx.fillStyle = '#aaa';
        let txt = mathVal.toString();
        let txtW = ctx.measureText(txt).width;
        if (px > txtW && px < w - txtW) {
            ctx.fillText(txt, px - txtW / 2 + 1, bottomY + 15);
        }
    }

    // Highlight exact solution
    if (targetVal !== null && targetVal >= gxMin && targetVal <= gxMax) {
        let px = ((targetVal - gxMin) / (gxMax - gxMin)) * w;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.rect(px - 4, startY - 5, 8, (4 * sh + 3 * gap) + 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Draw RGB 3D Marker
    if (sol4) {
        let rgbRId = getAxis('rgb-r'); let dR = getDom(rgbRId);
        let rgbGId = getAxis('rgb-g'); let dG = getDom(rgbGId);
        let rgbBId = getAxis('rgb-b'); let dB = getDom(rgbBId);
        drawRGBMarker(sol4[rgbRId], sol4[rgbGId], sol4[rgbBId], dR.min, dR.max, dG.min, dG.max, dB.min, dB.max);

        let mRId = getAxis('monge-r'); let dmR = getDom(mRId);
        let mGId = getAxis('monge-g'); let dmG = getDom(mGId);
        let mBId = getAxis('monge-b'); let dmB = getDom(mBId);
        drawMongeMarker(sol4[mRId], sol4[mGId], sol4[mBId], dmR.min, dmR.max, dmG.min, dmG.max, dmB.min, dmB.max);
    } else {
        // draw cube without marker
        const rgbCanvas = document.getElementById('rgbCube');
        if (rgbCanvas && rgbBgFullyRendered) {
            const rgbCtx = rgbCanvas.getContext('2d');
            rgbCtx.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
            rgbCtx.drawImage(rgbBgCanvas, 0, 0);
            drawRGBAxesText(rgbCtx);
        }

        // draw monge without marker
        const mCanvas = document.getElementById('mongeCanvas');
        if (mCanvas && mongeBgFullyRendered) {
            const mCtx = mCanvas.getContext('2d');
            mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
            mCtx.drawImage(mongeBgCanvas, 0, 0);
            drawMongeAxesText(mCtx, mCanvas.width, mCanvas.height);
        }
    }
}

// --- INVERSE KINEMATICS SOLVER ---
const ikCanvas = document.getElementById('ikCanvas');
let ikCtx = null;
let ikBgRendered = false;
let ikImageData = null;
let ikTarget = { x: 200, y: 150 };
let ikTension = 0;

if (ikCanvas) {
    ikCtx = ikCanvas.getContext('2d', { willReadFrequently: true });

    window.initIKBackground = function () {
        if (!ikCtx) return;
        const w = ikCanvas.width;
        const h = ikCanvas.height;
        const imgData = ikCtx.createImageData(w, h);
        const buf = new Uint32Array(imgData.data.buffer);

        let ikXId = getAxis('ik-x'); let domX = getDom(ikXId);
        let ikYId = getAxis('ik-y'); let domY = getDom(ikYId);
        let rem = [0, 1, 2, 3].filter(a => a !== ikXId && a !== ikYId);
        if (rem.length < 2) rem = [0, 1, 2, 3].filter(a => a !== ikXId);
        if (rem.length < 2) rem = [2, 3];
        let ikZId = rem[0]; let domZ = getDom(ikZId);
        let ikWId = rem[1]; let domW = getDom(ikWId);
        let applyIntensity = document.getElementById('ik-error-intensity') ? document.getElementById('ik-error-intensity').checked : true;

        draw2DLegend('ik-legend-2d');
        const ikLegendNames = ['X', 'Y', 'Z', 'W'];
        let lblR = document.getElementById('ik-legend-r-label');
        if (lblR) lblR.innerText = ikLegendNames[ikZId] + ' (Red)';
        let lblG = document.getElementById('ik-legend-g-label');
        if (lblG) lblG.innerText = ikLegendNames[ikWId] + ' (Green)';

        let S_CC = 0, S_DD = 0, S_CD = 0;
        const A = [], B = [], C = [], D = [], E = [];
        const varPrefixes = ['a', 'b', 'c', 'd', 'e'];
        for (let i = 1; i <= 4; i++) {
            let cv = getVal(varPrefixes[ikZId] + i); let dv = getVal(varPrefixes[ikWId] + i);
            A.push(getVal(varPrefixes[ikXId] + i)); B.push(getVal(varPrefixes[ikYId] + i));
            C.push(cv); D.push(dv); E.push(getVal('e' + i));
            S_CC += cv * cv; S_DD += dv * dv; S_CD += cv * dv;
        }
        const det = S_CC * S_DD - S_CD * S_CD;
        const hasSolution = Math.abs(det) > 1e-9;

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                let X = domX.min + (px / w) * (domX.max - domX.min);
                let Y = domY.min + ((h - py) / h) * (domY.max - domY.min);

                let R_val = 0, G_val = 0, Error = 0;

                if (hasSolution) {
                    let S_CK = 0, S_DK = 0;
                    for (let i = 0; i < 4; i++) {
                        let K = E[i] - A[i] * X - B[i] * Y;
                        S_CK += C[i] * K;
                        S_DK += D[i] * K;
                    }
                    let Z = (S_DD * S_CK - S_CD * S_DK) / det;
                    let W = (S_CC * S_DK - S_CD * S_CK) / det;

                    for (let i = 0; i < 4; i++) {
                        let err = C[i] * Z + D[i] * W + A[i] * X + B[i] * Y - E[i];
                        Error += err * err;
                    }
                    let zN = (Z - domZ.min) / (domZ.max - domZ.min);
                    let wN = (W - domW.min) / (domW.max - domW.min);
                    R_val = Math.max(0, Math.min(255, Math.round(zN * 255)));
                    G_val = Math.max(0, Math.min(255, Math.round(wN * 255)));
                } else {
                    Error = 999999;
                }

                let intensity = 1.0;
                if (applyIntensity) {
                    intensity = 1.0 / (1.0 + Error * 0.2);
                    intensity = Math.max(0, Math.min(1, intensity));
                }

                R_val = Math.round(R_val * intensity);
                G_val = Math.round(G_val * intensity);

                let idx = py * w + px;
                buf[idx] = (255 << 24) | (0 << 16) | (G_val << 8) | R_val;
            }
        }
        ikCtx.putImageData(imgData, 0, 0);
        ikImageData = imgData;
        ikBgRendered = true;
        if (window.drawIKOverlay) window.drawIKOverlay();
    }

    ikCanvas.addEventListener('mousedown', (e) => {
        ikCanvas.dataset.isDragging = 'true';
        handleIKInteraction(e);
    });
    ikCanvas.addEventListener('mouseup', () => ikCanvas.dataset.isDragging = 'false');
    ikCanvas.addEventListener('mouseleave', () => ikCanvas.dataset.isDragging = 'false');
    ikCanvas.addEventListener('mousemove', (e) => {
        if (ikCanvas.dataset.isDragging === 'true') {
            handleIKInteraction(e);
        }
    });

    function handleIKInteraction(e) {
        if (!ikBgRendered) return;
        const rect = ikCanvas.getBoundingClientRect();

        // Account for CSS scale / device pixel ratio offsets
        const scaleX = ikCanvas.width / rect.width;
        const scaleY = ikCanvas.height / rect.height;

        let px = (e.clientX - rect.left) * scaleX;
        let py = (e.clientY - rect.top) * scaleY;

        if (px < 0) px = 0; if (px >= ikCanvas.width) px = ikCanvas.width - 1;
        if (py < 0) py = 0; if (py >= ikCanvas.height) py = ikCanvas.height - 1;

        ikTarget.x = px;
        ikTarget.y = py;

        let ikXId = getAxis('ik-x'); let domX = getDom(ikXId);
        let ikYId = getAxis('ik-y'); let domY = getDom(ikYId);
        let rem = [0, 1, 2, 3].filter(a => a !== ikXId && a !== ikYId);
        if (rem.length < 2) rem = [0, 1, 2, 3].filter(a => a !== ikXId);
        if (rem.length < 2) rem = [2, 3];
        let ikZId = rem[0]; let domZ = getDom(ikZId);
        let ikWId = rem[1]; let domW = getDom(ikWId);

        // Precise linear domain mapping 
        let U_X = domX.min + (px / ikCanvas.width) * (domX.max - domX.min);
        // Standard mathematical Cartesian mapping (Y = max at top, Y = min at bottom)
        let U_Y = domY.min + ((ikCanvas.height - py) / ikCanvas.height) * (domY.max - domY.min);

        // Analytically determine old Z and W locally instead of from downsampled pixels
        let S_CC = 0, S_DD = 0, S_CD = 0;
        const MathA = [], MathB = [], MathC = [], MathD = [], MathE = [];
        const varPrefixes = ['a', 'b', 'c', 'd', 'e'];
        for (let i = 1; i <= 4; i++) {
            let cv = getVal(varPrefixes[ikZId] + i); let dv = getVal(varPrefixes[ikWId] + i);
            MathA.push(getVal(varPrefixes[ikXId] + i)); MathB.push(getVal(varPrefixes[ikYId] + i));
            MathC.push(cv); MathD.push(dv); MathE.push(getVal('e' + i));
            S_CC += cv * cv; S_DD += dv * dv; S_CD += cv * dv;
        }
        const det = S_CC * S_DD - S_CD * S_CD;
        let U_Z = 0, U_W = 0;

        if (Math.abs(det) > 1e-9) {
            let S_CK = 0, S_DK = 0;
            for (let i = 0; i < 4; i++) {
                let K = MathE[i] - MathA[i] * U_X - MathB[i] * U_Y;
                S_CK += MathC[i] * K;
                S_DK += MathD[i] * K;
            }
            U_Z = (S_DD * S_CK - S_CD * S_DK) / det;
            U_W = (S_CC * S_DK - S_CD * S_CK) / det;
        } else {
            let pidx = (Math.floor(py) * ikCanvas.width + Math.floor(px)) * 4;
            U_Z = domZ.min + (ikImageData.data[pidx] / 255) * (domZ.max - domZ.min);
            U_W = domW.min + (ikImageData.data[pidx + 1] / 255) * (domW.max - domW.min);
        }

        let U = [];
        U[ikXId] = U_X;
        U[ikYId] = U_Y;
        U[ikZId] = U_Z;
        U[ikWId] = U_W;
        U[4] = -1;

        let maxTension = 0;

        for (let row = 1; row <= 4; row++) {
            let rowTension = applySolverRow(row, U, varPrefixes);
            if (rowTension > maxTension) maxTension = rowTension;
        }

        ikTension = maxTension;

        drawAll();
        if (window.initIKBackground) window.initIKBackground();
    }

    function applySolverRow(row, U, prefixes) {
        let C = prefixes.map(p => getVal(p + row));
        let locked = prefixes.map(p => document.getElementById('l-' + p + row).checked);

        let softLimit = 100;
        let activeIndices = [0, 1, 2, 3, 4].filter(i => !locked[i]);

        let tension = 0;
        let iteration = 0;

        while (activeIndices.length > 0 && iteration < 10) {
            iteration++;
            let currentError = 0;
            for (let i = 0; i < 5; i++) {
                currentError += C[i] * U[i];
            }

            if (Math.abs(currentError) < 1e-6) {
                tension = 0;
                break;
            }

            let sumSq = 0;
            for (let idx of activeIndices) {
                sumSq += U[idx] * U[idx];
            }

            if (sumSq === 0) {
                tension = Math.abs(currentError);
                break;
            }

            let outOfBoundsFound = false;
            let tempC = [...C];

            for (let idx of activeIndices) {
                let delta = -currentError * U[idx] / sumSq;
                tempC[idx] = C[idx] + delta;
            }

            let newActive = [];
            for (let idx of activeIndices) {
                if (tempC[idx] > softLimit) {
                    C[idx] = softLimit;
                    outOfBoundsFound = true;
                } else if (tempC[idx] < -softLimit) {
                    C[idx] = -softLimit;
                    outOfBoundsFound = true;
                } else {
                    newActive.push(idx);
                }
            }

            if (!outOfBoundsFound) {
                for (let idx of activeIndices) {
                    C[idx] = tempC[idx];
                }
                tension = 0;
                break;
            } else {
                activeIndices = newActive;
            }
        }

        if (activeIndices.length === 0) {
            let finalError = 0;
            for (let i = 0; i < 5; i++) finalError += C[i] * U[i];
            if (Math.abs(finalError) > 1e-6) {
                tension = Math.abs(finalError);
            }
        }

        for (let i = 0; i < 5; i++) {
            let el = document.getElementById(prefixes[i] + row);
            if (!locked[i]) {
                el.value = parseFloat(C[i].toFixed(3));
            }
        }
        return tension;
    }

    window.drawIKOverlay = function () {
        if (!ikBgRendered) return;
        ikCtx.putImageData(ikImageData, 0, 0);

        const w = ikCanvas.width;
        const h = ikCanvas.height;
        let ikXId = getAxis('ik-x'); let domX = getDom(ikXId);
        let ikYId = getAxis('ik-y'); let domY = getDom(ikYId);
        const xMin = domX.min; const xMax = domX.max;
        const yMin = domY.min; const yMax = domY.max;

        // Draw Coordinate Grid
        ikCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        ikCtx.lineWidth = 1;
        ikCtx.beginPath();
        for (let ix = Math.ceil(xMin); ix <= Math.floor(xMax); ix++) {
            let px = ((ix - xMin) / (xMax - xMin)) * w;
            ikCtx.moveTo(px, 0); ikCtx.lineTo(px, h);
        }
        for (let iy = Math.ceil(yMin); iy <= Math.floor(yMax); iy++) {
            let py = h - ((iy - yMin) / (yMax - yMin)) * h;
            ikCtx.moveTo(0, py); ikCtx.lineTo(w, py);
        }
        ikCtx.stroke();

        // Draw specific axes if visible
        ikCtx.strokeStyle = 'rgba(255,255,255,0.4)';
        ikCtx.lineWidth = 1.5;
        ikCtx.beginPath();
        if (0 >= xMin && 0 <= xMax) {
            let px0 = ((0 - xMin) / (xMax - xMin)) * w;
            ikCtx.moveTo(px0, 0); ikCtx.lineTo(px0, h);
        }
        if (0 >= yMin && 0 <= yMax) {
            let py0 = h - ((0 - yMin) / (yMax - yMin)) * h;
            ikCtx.moveTo(0, py0); ikCtx.lineTo(w, py0);
        }
        ikCtx.stroke();

        let cx = ikTarget.x;
        let cy = ikTarget.y;

        let fillStyle = 'rgba(255,255,255,0.8)';
        let r_val = 0, g_val = 0;
        let pxF = Math.floor(cx), pyF = Math.floor(cy);
        if (pxF >= 0 && pxF < w && pyF >= 0 && pyF < h) {
            let ptIdx = (pyF * w + pxF) * 4;
            r_val = ikImageData.data[ptIdx];
            g_val = ikImageData.data[ptIdx + 1];
            fillStyle = `rgb(${r_val}, ${g_val}, 0)`;
        }

        // Draw regardless of cx, cy so target can float off canvas visually
        ikCtx.beginPath();
        ikCtx.arc(cx, cy, 6, 0, Math.PI * 2);
        ikCtx.fillStyle = fillStyle;
        ikCtx.fill();
        ikCtx.strokeStyle = ikTension > 0.1 ? '#ff4444' : '#fff';
        ikCtx.lineWidth = 2;
        ikCtx.stroke();

        // Update Legend Target
        let legCvs = document.getElementById('ik-legend-2d');
        if (legCvs) {
            draw2DLegend('ik-legend-2d');
            let legCtx = legCvs.getContext('2d');
            let legW = legCvs.width;
            let legH = legCvs.height;
            let lx = (r_val / 255) * (legW - 1);
            let ly = (legH - 1) - (g_val / 255) * (legH - 1);
            legCtx.beginPath();
            legCtx.arc(lx, ly, 4, 0, Math.PI * 2);
            legCtx.fillStyle = fillStyle;
            legCtx.fill();
            legCtx.strokeStyle = '#fff';
            legCtx.lineWidth = 1.5;
            legCtx.stroke();
        }

        if (ikTension > 0.1) {
            ikCtx.beginPath();
            ikCtx.moveTo(cx - 20, cy - 20); ikCtx.lineTo(cx + 20, cy + 20);
            ikCtx.moveTo(cx - 20, cy + 20); ikCtx.lineTo(cx + 20, cy - 20);
            ikCtx.strokeStyle = 'red';
            ikCtx.stroke();
            ikCtx.fillStyle = 'white';
            ikCtx.font = '14px sans-serif';
            ikCtx.fillText(`TENSION: ${ikTension.toFixed(2)}`, Math.max(10, cx - 40), cy - 10);

            ikCanvas.style.boxShadow = '0 0 20px rgba(255,0,0,0.8)';
        } else {
            ikCanvas.style.boxShadow = 'none';
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initRGBCubeBG();
    initMongeBG();
    if (ikCanvas) initIKBackground();
    drawAll();
});