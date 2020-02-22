console.log = (msg) => {
    var json = document.getElementById("json");
    if (!!json) {
        json.innerText = JSON.stringify(msg, null, 4);
    }
}

var $ = document.querySelector.bind(document);
var camera = new THREE.Camera();
camera.position.z = 1;

var scene = new THREE.Scene();

var geometry = new THREE.PlaneBufferGeometry(2, 2);

var settings = {};
var uniforms = {
    time: { type: "f", value: 1.0 },
    resolution: {
        type: "v2", value: new THREE.Vector2(),
    },
    size: { type: "f", value: 2.5 },
    threshold: { type: "f", value: 0.35 },
    color: { type: "c", value: new THREE.Color(1, 0, 0) },
};

var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: $('#vert').textContent,
    fragmentShader: $('#frag').textContent,
});

var mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

var renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

var audio = 0;

window.onload = function () {
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);
}

window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {
        if (properties.color) {
            let color = properties.color.value.split(" ");
            uniforms.color.value = new THREE.Color(color[0], color[1], color[2]);
        }
        if (properties.lightness) {
            settings.lightness = properties.lightness.value;
        }
        if (properties.saturation) {
            settings.saturation = properties.saturation.value;
        }
        if (properties.size) {
            uniforms.size.value = properties.size.value;
        }
        if (properties.threshold) {
            uniforms.threshold.value = (properties.threshold.value - .01) / 100;
        }
        if (properties.changecolor) {
            settings.changeColor = properties.changecolor.value;
            if (!settings.changeColor) {
                uniforms.color.value = new THREE.Color();
            } else {
                uniforms.color.value = new THREE.Color(`hsl(0, ${settings.saturation}%, ${settings.lightness}%`)
            }
        }
        if (properties.audioSensitivity) {
            settings.audioSensitivity = properties.audioSensitivity.value;
        }
        if (properties.power) {
            settings.power = properties.power.value;
        }
    }
};

render(0);

function wallpaperAudioListener(audioArray) {
    // uniforms.audio.value = audioArray;
    audio = 0;
    var amplitude = .45;
    max = 0;
    for (var i = 0; i < 64; i++) {
        var k = amplitude * ((audioArray[i] + audioArray[i + 64]) / 2);
        if (k > max) max = k;
        audio += k;
        amplitude *= !!settings.power ? settings.power : .9;
    }
    audio /= 6;
}

function resize() {
    var canvas = renderer.domElement;
    var dpr = window.devicePixelRatio;  // make 1 or less if too slow
    var width = canvas.clientWidth * dpr;
    var height = canvas.clientHeight * dpr;
    if (width != canvas.width || height != canvas.height) {
        renderer.setSize(width, height, false);
        uniforms.resolution.value.x = renderer.domElement.width;
        uniforms.resolution.value.y = renderer.domElement.height;
    }
}
function render(time) {
    var p = !!settings.audioSensitivity ? settings.audioSensitivity : 2;
    var t = (0.015 + audio * p);
    uniforms.time.value += t;

    if (!!settings.changeColor) {
        var h = ((Math.sin(uniforms.time.value * .1) * .5 + .5));
        if (!settings.saturation) settings.saturation = 100;
        if (!settings.saturation) settings.lightness = 80;
        this.uniforms.color.value.setHSL(h, settings.saturation / 100, settings.lightness / 100);
    }
    resize();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}