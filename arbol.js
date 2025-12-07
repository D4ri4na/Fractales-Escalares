"use strict";

var arbolPitagorico = function() {
    var gl;
    var program;

    // Geometría del árbol
    var cylinderVertices;
    var cylinderNormals;
    var cylinderIndices;
    var leafVertices;
    var leafNormals;
    var leafIndices;

    // Arrays para instancias
    var branchMatrices = [];
    var branchColors = [];
    var leafMatrices = [];
    var leafColors = [];

    // VAOs y buffers
    var branchVAO, leafVAO;
    var branchMatBuffer, branchColorBuffer;
    var leafMatBuffer, leafColorBuffer;

    // Parámetros del árbol
    var params = {
        scaleFactor: 0.70,
        angle: 35,
        depth: 8,
        season: 0,
        wind: 0.3,
        branchCount: 2,
        leafDensity: 0.8
    };

    // Cámara
    var camera = {
        position: [0, 5, 15],
        rotation: [0, 0],
        distance: 15
    };

    // Control de mouse
    var isDragging = false;
    var lastMouse = [0, 0];

    // Animación
    var startTime = Date.now();
    var growthAnimation = 1;
    var isAnimating = false;

    // Colores estacionales mejorados
    var seasonColors = [
        [[0.2, 0.5, 0.1], [0.3, 0.8, 0.2]], // Verano
        [[0.9, 0.6, 0.1], [0.95, 0.4, 0.05]], // Otoño
        [[0.35, 0.25, 0.15], [0.5, 0.35, 0.2]], // Invierno
        [[0.5, 0.7, 0.2], [0.7, 0.9, 0.3]]  // Primavera
    ];

    // Uniforms
    var modelViewMatrixLoc, projectionMatrixLoc;
    var timeLoc, windLoc, lightPosLoc, cameraPosLoc;

    window.onload = function init() {
        console.log("Inicializando árbol pitagórico mejorado...");

        var canvas = document.getElementById("gl-canvas");
        gl = canvas.getContext('webgl2');

        if (!gl) {
            alert("WebGL 2.0 no está disponible");
            return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.05, 0.08, 0.15, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

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
        if (!program || program == -1) {
            throw new Error("Error en shaders");
        }
        gl.useProgram(program);

        projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
        modelViewMatrixLoc = gl.getUniformLocation(program, "uViewMatrix");
        timeLoc = gl.getUniformLocation(program, "uTime");
        windLoc = gl.getUniformLocation(program, "uWindStrength");
        lightPosLoc = gl.getUniformLocation(program, "uLightPosition");
        cameraPosLoc = gl.getUniformLocation(program, "uCameraPosition");
    }

    function initGeometry() {
        // Cilindro para ramas (más realista que cubo)
        var segments = 12;
        var height = 1.0;
        var radius = 0.5;

        var vertices = [];
        var normals = [];
        var indices = [];

        // Generar cilindro con tapas
        for (var i = 0; i <= segments; i++) {
            var angle = (i / segments) * Math.PI * 2;
            var x = radius * Math.cos(angle);
            var z = radius * Math.sin(angle);

            // Base
            vertices.push(x, -height/2, z);
            normals.push(Math.cos(angle), 0, Math.sin(angle));

            // Top
            vertices.push(x, height/2, z);
            normals.push(Math.cos(angle), 0, Math.sin(angle));
        }

        // Tapa inferior
        var centerBottom = vertices.length / 3;
        vertices.push(0, -height/2, 0);
        normals.push(0, -1, 0);

        // Tapa superior
        var centerTop = vertices.length / 3;
        vertices.push(0, height/2, 0);
        normals.push(0, 1, 0);

        // Cara lateral
        for (var i = 0; i < segments; i++) {
            indices.push(i*2, i*2+1, (i*2+2) % (segments*2));
            indices.push((i*2+2) % (segments*2), i*2+1, (i*2+3) % (segments*2));
        }

        // Tapa inferior
        for (var i = 0; i < segments; i++) {
            indices.push(centerBottom, i*2, ((i+1)*2) % (segments*2));
        }

        // Tapa superior
        for (var i = 0; i < segments; i++) {
            indices.push(centerTop, i*2+1, ((i+1)*2+1) % (segments*2));
        }

        cylinderVertices = new Float32Array(vertices);
        cylinderNormals = new Float32Array(normals);
        cylinderIndices = new Uint16Array(indices);

        // Hojas (triángulos)
        leafVertices = new Float32Array([
            -0.3, -0.5, 0,  0.3, -0.5, 0,  0, 0.5, 0
        ]);
        leafNormals = new Float32Array([
            0, 0, 1, 0, 0, 1, 0, 0, 1
        ]);
        leafIndices = new Uint16Array([0, 1, 2]);
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

        // Tronco principal
        var trunk = createTransformMatrix([0, 0, 0], [0.3, 2, 0.3], 0, 0, 0);
        var trunkColor = [0.4, 0.25, 0.1];

        branchMatrices.push(...trunk);
        branchColors.push(...trunkColor);

        // Generar ramas
        generateBranch([0, 2, 0], [0, 1, 0], 1, params.depth, 0.3);

        updateStats();
    }

    function generateBranch(pos, dir, depth, maxDepth, size) {
        if (depth > maxDepth) return;

        var scale = Math.pow(params.scaleFactor, depth);
        var angleRad = params.angle * Math.PI / 180;

        for (var i = 0; i < params.branchCount; i++) {
            var angle = (i - (params.branchCount-1)/2) * angleRad;
            var rotY = Math.atan2(dir[0], dir[2]) + angle;
            var rotX = Math.asin(-dir[1]) * 0.7;

            var newDir = [
                Math.sin(rotY) * Math.cos(rotX),
                -Math.sin(rotX),
                Math.cos(rotY) * Math.cos(rotX)
            ];

            var len = size * scale * 1.5;
            var newPos = [
                pos[0] + newDir[0] * len,
                pos[1] + newDir[1] * len,
                pos[2] + newDir[2] * len
            ];

            var branchSize = size * scale * 0.8;

            // Añadir un pequeño ángulo aleatorio para naturalidad
            rotY += (Math.random() - 0.5) * 0.2;
            rotX += (Math.random() - 0.5) * 0.2;

            var matrix = createTransformMatrix(
                newPos,
                [branchSize, len, branchSize],
                rotX, rotY, 0
            );

            // Color según estación y profundidad
            var t = depth / maxDepth;
            var colors = seasonColors[params.season];
            var color = [
                colors[0][0] * (1 - t) + colors[1][0] * t,
                colors[0][1] * (1 - t) + colors[1][1] * t,
                colors[0][2] * (1 - t) + colors[1][2] * t
            ];

            branchMatrices.push(...matrix);
            branchColors.push(...color);

            // Agregar hojas en ramas terminales
            if (depth > maxDepth - 2 && Math.random() < params.leafDensity) {
                var leafMatrix = createTransformMatrix(
                    newPos,
                    [branchSize * 1.2, branchSize * 1.2, 1],
                    rotX + Math.random() * 0.5, rotY, 0
                );
                leafMatrices.push(...leafMatrix);
                leafColors.push(color[0] * 0.8, color[1] * 1.1, color[2] * 0.7);
            }

            generateBranch(newPos, newDir, depth + 1, maxDepth, branchSize);
        }
    }

    function setupRenderBuffers() {
        // Ramas VAO
        branchVAO = gl.createVertexArray();
        gl.bindVertexArray(branchVAO);

        var posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cylinderVertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        var normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cylinderNormals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        branchMatBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, branchMatBuffer);

        for (var i = 0; i < 4; i++) {
            var loc = 2 + i;
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16);
            gl.vertexAttribDivisor(loc, 1);
        }

        branchColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, branchColorBuffer);
        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(6, 1);

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinderIndices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);
    }

    function render() {
        var time = (Date.now() - startTime) / 1000;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (branchMatrices.length === 0) {
            requestAnimationFrame(render);
            return;
        }

        var aspect = gl.canvas.width / gl.canvas.height;
        var projectionMatrix = perspective(45, aspect, 0.1, 100);
        var viewMatrix = lookAt(
            vec3(camera.position[0], camera.position[1], camera.position[2]),
            vec3(0, 3, 0),
            vec3(0, 1, 0)
        );

        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(viewMatrix));
        gl.uniform1f(timeLoc, time);
        gl.uniform1f(windLoc, params.wind);
        gl.uniform3fv(lightPosLoc, [15, 20, 15]);
        gl.uniform3fv(cameraPosLoc, camera.position);

        setupRenderBuffers();

        var numBranches = branchMatrices.length / 16;
        gl.bindVertexArray(branchVAO);
        gl.bindBuffer(gl.COPY_READ_BUFFER, gl.createBuffer());
        gl.bufferData(gl.COPY_READ_BUFFER, new Float32Array(branchMatrices), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, branchMatBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(branchMatrices), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, branchColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(branchColors), gl.DYNAMIC_DRAW);

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinderIndices, gl.STATIC_DRAW);

        gl.drawElementsInstanced(gl.TRIANGLES, cylinderIndices.length, gl.UNSIGNED_SHORT, 0, numBranches);

        gl.bindVertexArray(null);
        requestAnimationFrame(render);
    }

    function setupControls() {
        document.getElementById('scaleFactor').oninput = function(e) {
            params.scaleFactor = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = params.scaleFactor.toFixed(2);
            generateTree();
        };

        document.getElementById('angle').oninput = function(e) {
            params.angle = parseInt(e.target.value);
            document.getElementById('angleValue').textContent = params.angle + '°';
            generateTree();
        };

        document.getElementById('depth').oninput = function(e) {
            params.depth = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = params.depth;
            generateTree();
        };

        document.getElementById('branchCount').oninput = function(e) {
            params.branchCount = parseInt(e.target.value);
            document.getElementById('branchCountValue').textContent = params.branchCount;
            generateTree();
        };

        document.getElementById('leafDensity').oninput = function(e) {
            params.leafDensity = parseFloat(e.target.value);
            document.getElementById('leafDensityValue').textContent = params.leafDensity.toFixed(1);
            generateTree();
        };

        document.getElementById('season').oninput = function(e) {
            params.season = parseInt(e.target.value);
            var seasons = ['Verano', 'Otoño', 'Invierno', 'Primavera'];
            document.getElementById('seasonValue').textContent = seasons[params.season];
            generateTree();
        };

        document.getElementById('wind').oninput = function(e) {
            params.wind = parseFloat(e.target.value);
            document.getElementById('windValue').textContent = params.wind.toFixed(1);
        };

        document.getElementById('resetBtn').onclick = function() {
            params = { scaleFactor: 0.70, angle: 35, depth: 8, season: 0, wind: 0.3, branchCount: 2, leafDensity: 0.8 };
            document.getElementById('scaleFactor').value = 0.70;
            document.getElementById('angle').value = 35;
            document.getElementById('depth').value = 8;
            document.getElementById('branchCount').value = 2;
            document.getElementById('leafDensity').value = 0.8;
            document.getElementById('season').value = 0;
            document.getElementById('wind').value = 0.3;
            document.getElementById('scaleValue').textContent = '0.70';
            document.getElementById('angleValue').textContent = '35°';
            document.getElementById('depthValue').textContent = '8';
            document.getElementById('branchCountValue').textContent = '2';
            document.getElementById('leafDensityValue').textContent = '0.8';
            document.getElementById('seasonValue').textContent = 'Verano';
            document.getElementById('windValue').textContent = '0.3';
            generateTree();
        };

        document.getElementById('animateBtn').onclick = function() {
            growthAnimation = 0;
            isAnimating = true;
        };
    }

    function setupMouse(canvas) {
        canvas.onmousedown = function(e) {
            isDragging = true;
            lastMouse = [e.clientX, e.clientY];
        };

        canvas.onmousemove = function(e) {
            if (isDragging) {
                var dx = e.clientX - lastMouse[0];
                var dy = e.clientY - lastMouse[1];

                camera.rotation[0] += dy * 0.01;
                camera.rotation[1] += dx * 0.01;

                camera.position[0] = camera.distance * Math.sin(camera.rotation[1]) * Math.cos(camera.rotation[0]);
                camera.position[1] = 5 + camera.distance * Math.sin(camera.rotation[0]);
                camera.position[2] = camera.distance * Math.cos(camera.rotation[1]) * Math.cos(camera.rotation[0]);

                lastMouse = [e.clientX, e.clientY];
            }
        };

        canvas.onmouseup = function() {
            isDragging = false;
        };

        canvas.onmouseleave = function() {
            isDragging = false;
        };

        canvas.onwheel = function(e) {
            e.preventDefault();
            camera.distance += e.deltaY * 0.01;
            camera.distance = Math.max(5, Math.min(camera.distance, 50));
            camera.position[0] = camera.distance * Math.sin(camera.rotation[1]) * Math.cos(camera.rotation[0]);
            camera.position[1] = 5 + camera.distance * Math.sin(camera.rotation[0]);
            camera.position[2] = camera.distance * Math.cos(camera.rotation[1]) * Math.cos(camera.rotation[0]);
        };
    }

    function updateStats() {
        var numBranches = branchMatrices.length / 16;
        document.getElementById('cubeCount').textContent = Math.floor(numBranches);

        var N = Math.pow(params.branchCount, params.depth);
        var r = params.scaleFactor;
        var D = Math.log(N) / Math.log(1/r);
        document.getElementById('dimFractal').textContent = D.toFixed(2);
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
