"use strict";

var arbolPitagorico = function() {
    var gl;
    var program;

    // Geometría
    var cylinderVertices, cylinderNormals, cylinderIndices;
    var leafVertices, leafNormals, leafIndices;

    // Arrays para instancias
    var branchMatrices = [];
    var branchColors = [];
    var leafMatrices = [];
    var leafColors = [];

    // Parámetros del árbol
    var params = {
        scaleFactor: 0.70,     
        angle: 25,
        depth: 9,
        season: 0,
        wind: 0.0,
        branchCount: 2,
        leafDensity: 0.9,
        randomness: 0.15
    };

    // Cámara
    var camera = {
        position: [0, 15, 50],
        rotation: [0, 0],
        distance: 50
    };

    // Control de mouse
    var isDragging = false;
    var lastMouse = [0, 0];
    var startTime = Date.now();

    var seasonColors = {
        branch: [0.4, 0.25, 0.1], 
        leaf: [
            [0.2, 0.7, 0.2],      // Verano
            [0.9, 0.45, 0.1],     // Otoño
            [0.4, 0.3, 0.2],      // Invierno
            [0.95, 0.7, 0.8]      // Primavera
        ]
    };

    var modelViewMatrixLoc, projectionMatrixLoc;
    var timeLoc, windLoc, lightPosLoc, cameraPosLoc;

    window.onload = function init() {
        var canvas = document.getElementById("gl-canvas");
        gl = canvas.getContext('webgl2');

        if (!gl) {
            alert("WebGL 2.0 no está disponible");
            return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.92, 0.92, 0.95, 1.0); 
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE); 

        try {
            setupShaders();
            initGeometry();
            setupControls();
            setupMouse(canvas);
            document.getElementById('loading').style.display = 'none';
            generateTree();
            render();
        } catch(e) {
            console.error("Error:", e);
            alert("Error: " + e.message);
        }
    };

    function setupShaders() {
        program = initShaders(gl, "vertex-shader", "fragment-shader");
        if (!program || program == -1) throw new Error("Error en shaders");
        gl.useProgram(program);

        projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
        modelViewMatrixLoc = gl.getUniformLocation(program, "uViewMatrix");
        timeLoc = gl.getUniformLocation(program, "uTime");
        windLoc = gl.getUniformLocation(program, "uWindStrength");
        lightPosLoc = gl.getUniformLocation(program, "uLightPosition");
        cameraPosLoc = gl.getUniformLocation(program, "uCameraPosition");
    }

    function initGeometry() {
        // --- CILINDRO PARA RAMAS ---
        var segments = 24;
        var radius = 0.5; 
        var height = 1.0;

        var bVerts = [], bNorms = [], bInds = [];

        for (var i = 0; i <= segments; i++) {
            var angle = (i / segments) * Math.PI * 2;
            var c = Math.cos(angle);
            var s = Math.sin(angle);

            // Base inferior
            bVerts.push(c * radius, -height/2, s * radius);
            bNorms.push(c, 0, s);

            // Tope superior (sin afinamiento)
            bVerts.push(c * radius, height/2, s * radius);
            bNorms.push(c, 0, s);
        }

        for (var i = 0; i < segments; i++) {
            var p1 = i * 2;
            var p2 = p1 + 1;
            var p3 = (i * 2 + 2) % ((segments + 1) * 2);
            var p4 = (i * 2 + 3) % ((segments + 1) * 2);

            bInds.push(p1, p2, p3);
            bInds.push(p3, p2, p4);
        }

        // Tapas superior e inferior
        var bottomIdx = bVerts.length / 3;
        bVerts.push(0, -height/2, 0);
        bNorms.push(0, -1, 0);
        for (var i = 0; i < segments; i++) {
            var idx1 = i * 2;
            var idx2 = ((i + 1) % segments) * 2;
            bInds.push(bottomIdx, idx2, idx1);
        }

        var topIdx = bVerts.length / 3;
        bVerts.push(0, height/2, 0);
        bNorms.push(0, 1, 0);
        for (var i = 0; i < segments; i++) {
            var idx1 = i * 2 + 1;
            var idx2 = ((i + 1) % segments) * 2 + 1;
            bInds.push(topIdx, idx1, idx2);
        }

        cylinderVertices = new Float32Array(bVerts);
        cylinderNormals = new Float32Array(bNorms);
        cylinderIndices = new Uint16Array(bInds);

        // --- HOJAS ---
        var lVerts = [
            0, -0.5, 0,   // Base
            -0.4, 0.2, 0.1, // Izquierda
            0.4, 0.2, 0.1,  // Derecha
            0, 0.8, 0     // Punta
        ];
        var lNorms = [0,0,1, 0,0,1, 0,0,1, 0,0,1];
        var lInds = [0,2,1, 1,2,3, 0,1,2, 3,2,1];

        leafVertices = new Float32Array(lVerts);
        leafNormals = new Float32Array(lNorms);
        leafIndices = new Uint16Array(lInds);
    }

    function createTransformMatrix(pos, scale, rotX, rotY, rotZ) {
        var c1 = Math.cos(rotX), s1 = Math.sin(rotX);
        var c2 = Math.cos(rotY), s2 = Math.sin(rotY);
        var c3 = Math.cos(rotZ), s3 = Math.sin(rotZ);

        return [
            scale[0] * (c2 * c3),
            scale[0] * (c2 * s3),
            scale[0] * (-s2),
            0,
            scale[1] * (s1 * s2 * c3 - c1 * s3),
            scale[1] * (s1 * s2 * s3 + c1 * c3),
            scale[1] * (s1 * c2),
            0,
            scale[2] * (c1 * s2 * c3 + s1 * s3),
            scale[2] * (c1 * s2 * s3 - s1 * c3),
            scale[2] * (c1 * c2),
            0,
            pos[0], pos[1], pos[2], 1
        ];
    }

    function generateTree() {
        branchMatrices = [];
        branchColors = [];
        leafMatrices = [];
        leafColors = [];

        var trunkHeight = 10.0;
        var trunkWidth = 0.6;
        
        // Tronco recto y más grueso
        var trunk = createTransformMatrix(
            [0, trunkHeight/2, 0], 
            [trunkWidth, trunkHeight, trunkWidth], 
            0, 0, 0
        );
        branchMatrices.push(...trunk);
        branchColors.push(...seasonColors.branch);

        // Generar 8 conjuntos de ramas radiales desde la parte superior
        var initialLength = 4.5;
        var numRadialPlanes = 8;
        for (var i = 0; i < numRadialPlanes; i++) {
            var planeRotation = (i / numRadialPlanes) * Math.PI * 2;
            drawBranch([0, trunkHeight, 0], initialLength, params.depth, 0, planeRotation);
        }

        updateStats();
    }

    function drawBranch(startPos, length, depth, rotation, planeRotation) {
        if (depth === 0) return;

        var randomRotation = (Math.random() - 0.5) * params.randomness;
        rotation += randomRotation;

        var branchWidth = 0.40;

        // Calcular posición final en base al plano de rotación
        var cosPlane = Math.cos(planeRotation);
        var sinPlane = Math.sin(planeRotation);

        var dirX = length * Math.sin(rotation) * cosPlane;
        var dirY = length * Math.cos(rotation);
        var dirZ = length * Math.sin(rotation) * sinPlane;

        var endX = startPos[0] + dirX;
        var endY = startPos[1] + dirY;
        var endZ = startPos[2] + dirZ;

        var midX = (startPos[0] + endX) / 2;
        var midY = (startPos[1] + endY) / 2;
        var midZ = (startPos[2] + endZ) / 2;

        // Calcular ángulos de rotación correctamente
        var vertAngle = Math.atan2(
            Math.sqrt(dirX * dirX + dirZ * dirZ),
            dirY
        );
        var horAngle = Math.atan2(dirZ, dirX);

        var matrix = createTransformMatrix(
    [midX, midY, midZ],
    [branchWidth, length, branchWidth],
    vertAngle,
    horAngle,
    0
);


        // Color con degradado
        var depthRatio = 1 - (depth / params.depth);
        var branchColor = [
            Math.min(seasonColors.branch[0] + depthRatio * 0.2, 1.0),
            Math.min(seasonColors.branch[1] + depthRatio * 0.25, 1.0),
            Math.min(seasonColors.branch[2] + depthRatio * 0.15, 1.0)
        ];

        branchMatrices.push(...matrix);
        branchColors.push(...branchColor);

        // Hojas
        if (depth <= 4 && Math.random() < params.leafDensity) {
            var leafScale = 0.8 + Math.random() * 0.4;
            var leafMatrix = createTransformMatrix(
                [endX, endY, endZ],
                [leafScale, leafScale, leafScale],
                Math.random() * Math.PI, 
                Math.random() * Math.PI, 
                Math.random() * Math.PI
            );
            leafMatrices.push(...leafMatrix);
            
            var leafColor = seasonColors.leaf[params.season];
            leafColors.push(...leafColor);
        }

        // Recursión
        var newLength = length * params.scaleFactor;
        var angleRad = params.angle * Math.PI / 180;

        drawBranch([endX, endY, endZ], newLength, depth - 1, rotation + angleRad, planeRotation);
        drawBranch([endX, endY, endZ], newLength, depth - 1, rotation - angleRad, planeRotation);
    }

    function render() {
        var time = (Date.now() - startTime) / 1000;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (branchMatrices.length === 0) {
            requestAnimationFrame(render);
            return;
        }

        var aspect = gl.canvas.width / gl.canvas.height;
        var projectionMatrix = perspective(35, aspect, 0.1, 250);
        
        // --- CÁMARA ORBITAL CORREGIDA ---
        // Convertimos las coordenadas esféricas (rotación mouse) a cartesianas
        var camX = Math.sin(camera.rotation[1]) * Math.cos(camera.rotation[0]) * camera.distance;
        var camY = Math.sin(camera.rotation[0]) * camera.distance + 15;
        var camZ = Math.cos(camera.rotation[1]) * Math.cos(camera.rotation[0]) * camera.distance;

        var viewMatrix = lookAt(
            vec3(camX, camY, camZ), // Nueva posición dinámica
            vec3(0, 15, 0),          // Target fijo
            vec3(0, 1, 0)           // Vector UP
        );

        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(viewMatrix));
        gl.uniform1f(timeLoc, time);
        
        // Viento mejorado con múltiples capas de ondas
        var windStrength = calculateRealisticWind(time, params.wind);
        gl.uniform1f(windLoc, windStrength);
        
        gl.uniform3fv(lightPosLoc, [40, 80, 50]); 
        gl.uniform3fv(cameraPosLoc, [camX, camY, camZ]);

        renderInstanced(cylinderVertices, cylinderNormals, cylinderIndices, branchMatrices, branchColors);
        renderInstanced(leafVertices, leafNormals, leafIndices, leafMatrices, leafColors);

        requestAnimationFrame(render);
    }

    // Función para calcular viento realista con múltiples capas
    function calculateRealisticWind(time, windIntensity) {
        if (windIntensity === 0) return 0;

        // Onda principal lenta y suave (raffagas principales)
        var mainWind = Math.sin(time * 0.5) * 0.6;
        
        // Onda secundaria más rápida (movimiento natural del aire)
        var secondaryWind = Math.sin(time * 1.2) * 0.3 + Math.sin(time * 0.8) * 0.2;
        
        // Onda terciaria para más complejidad (turbulencia)
        var turbulence = Math.sin(time * 2.5 + Math.cos(time * 0.3)) * 0.15;
        
        // Variación aleatoria suave usando ruido Perlin aproximado
        var randomNoise = Math.sin(time * 0.7 + 12.9898) * 0.1;
        
        // Combinar todas las ondas
        var totalWind = mainWind + secondaryWind + turbulence + randomNoise;
        
        // Normalizar y aplicar intensidad
        totalWind = Math.max(-1, Math.min(1, totalWind));
        totalWind *= windIntensity;
        
        return totalWind;
    }

    function renderInstanced(vertices, normals, indices, matrices, colors) {
        if (matrices.length === 0) return;

        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        var posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        var normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        var matBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, matBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(matrices), gl.DYNAMIC_DRAW);

        for (var i = 0; i < 4; i++) {
            gl.enableVertexAttribArray(2 + i);
            gl.vertexAttribPointer(2 + i, 4, gl.FLOAT, false, 64, i * 16);
            gl.vertexAttribDivisor(2 + i, 1);
        }

        var colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(6, 1);

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        var numInstances = matrices.length / 16;
        gl.drawElementsInstanced(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0, numInstances);

        gl.bindVertexArray(null);
    }

    function setupControls() {
        var updateVal = function(id, val, suffix) {
            var el = document.getElementById(id);
            if (el) el.textContent = val + (suffix || '');
        };
        
        var setupInput = function(id, key, isFloat, suffix) {
            var el = document.getElementById(id);
            if (el) {
                el.oninput = function(e) {
                    params[key] = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
                    updateVal(id + 'Value', isFloat ? params[key].toFixed(2) : params[key], suffix);
                    if(key !== 'wind') generateTree();
                };
            }
        };

        setupInput('scaleFactor', 'scaleFactor', true);
        setupInput('angle', 'angle', false, '°');
        setupInput('depth', 'depth', false);
        setupInput('branchCount', 'branchCount', false);
        setupInput('leafDensity', 'leafDensity', true);
        setupInput('wind', 'wind', true);

        var seasonInput = document.getElementById('season');
        if (seasonInput) {
            seasonInput.oninput = function(e) {
                params.season = parseInt(e.target.value);
                var seasons = ['Verano', 'Otoño', 'Invierno', 'Primavera'];
                updateVal('seasonValue', seasons[params.season]);
                generateTree();
            };
        }

        var resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.onclick = function() {
                params.scaleFactor = 0.70;
                params.angle = 25;
                params.depth = 9;
                params.season = 0;
                params.wind = 0.0;
                
                document.getElementById('scaleFactor').value = 0.70;
                document.getElementById('angle').value = 25;
                document.getElementById('depth').value = 9;
                document.getElementById('season').value = 0;
                document.getElementById('wind').value = 0.0;
                
                updateVal('scaleValue', '0.70');
                updateVal('angleValue', '25°');
                updateVal('depthValue', '9');
                updateVal('seasonValue', 'Verano');
                updateVal('windValue', '0.0');
                
                generateTree();
            };
        }

        var animateBtn = document.getElementById('animateBtn');
        if (animateBtn) animateBtn.onclick = generateTree;
    }

    function setupMouse(canvas) {
        canvas.onmousedown = function(e) { isDragging = true; lastMouse = [e.clientX, e.clientY]; };
        document.onmouseup = function() { isDragging = false; };
        
        canvas.onmousemove = function(e) {
            if (isDragging) {
                var dx = e.clientX - lastMouse[0];
                var dy = e.clientY - lastMouse[1];
                
                camera.rotation[1] += dx * 0.01;
                camera.rotation[0] += dy * 0.01;
                camera.rotation[0] = Math.max(-1.5, Math.min(1.5, camera.rotation[0]));
                
                lastMouse = [e.clientX, e.clientY];
            }
        };
        canvas.onwheel = function(e) {
            e.preventDefault();
            camera.distance += e.deltaY * 0.05;
            camera.distance = Math.max(20, Math.min(120, camera.distance));
        };
    }

    function updateStats() {
        var numTotal = branchMatrices.length / 16 + leafMatrices.length / 16;
        var el = document.getElementById('cubeCount');
        if(el) el.textContent = Math.floor(numTotal);
        
        var N = Math.pow(2, params.depth);
        var r = params.scaleFactor;
        var D = -Math.log(N) / Math.log(r); 
        var elD = document.getElementById('dimFractal');
        if(elD) elD.textContent = Math.abs(D).toFixed(2);
    }

    function perspective(fovy, aspect, near, far) {
        var f = 1.0 / Math.tan(radians(fovy) / 2);
        var nf = 1 / (near - far);
        return mat4(
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        );
    }
};

arbolPitagorico();