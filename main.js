frag = `
uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;
uniform vec3 color;
uniform float size;
uniform float threshold;

float rand(float n){return fract(sin(n)*43758.5453123);}

float noise(float p){
    float fl=floor(p);
    float fc=fract(p);
    return mix(rand(fl),rand(fl+1.),fc);
}

/* discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 */
vec3 random3(vec3 c) {
    float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
    vec3 r;
    r.z = fract(512.0*j);
    j *= .125;
    r.x = fract(512.0*j);
    j *= .125;
    r.y = fract(512.0*j);
    return r-0.5;
}

/* skew constants for 3d simplex functions */
const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
    /* 1. find current tetrahedron T and it's four vertices */
    /* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
    /* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
    
    /* calculate s and x */
    vec3 s = floor(p + dot(p, vec3(F3)));
    vec3 x = p - s + dot(s, vec3(G3));
    
    /* calculate i1 and i2 */
    vec3 e = step(vec3(0.0), x - x.yzx);
    vec3 i1 = e*(1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy*(1.0 - e);
        
    /* x1, x2, x3 */
    vec3 x1 = x - i1 + G3;
    vec3 x2 = x - i2 + 2.0*G3;
    vec3 x3 = x - 1.0 + 3.0*G3;
    
    /* 2. find four surflets and store them in d */
    vec4 w, d;
    
    /* calculate surflet weights */
    w.x = dot(x, x);
    w.y = dot(x1, x1);
    w.z = dot(x2, x2);
    w.w = dot(x3, x3);
    
    /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
    w = max(0.6 - w, 0.0);
    
    /* calculate surflet components */
    d.x = dot(random3(s), x);
    d.y = dot(random3(s + i1), x1);
    d.z = dot(random3(s + i2), x2);
    d.w = dot(random3(s + 1.0), x3);
    
    /* multiply d by w^4 */
    w *= w;
    w *= w;
    d *= w;
    
    /* 3. return the sum of the four surflets */
    return dot(d, vec4(52.0));
}

void main(  ) {
    vec4 fragCoord = gl_FragCoord;
    vec2 uv = (fragCoord.xy / resolution.xy) * 2. - 1.;
    uv *= resolution.x/resolution.y;

    vec3 uvt = vec3(uv*(2.), (time)*(.05));            
    uvt.x = uvt.x < 0. ? uvt.x : -uvt.x;
    float value=0.;
    float persistence=.5;
    float amplitude=1.;
    float frequency=1.;
    float maxValue=0.; 
    for(int i=0;i<4;i++){
        value+=simplex3d(uvt*frequency)*amplitude;    
        maxValue+=amplitude;      
        amplitude*=persistence;
        frequency*=2.;
    }
    value=.5+.5*(value/maxValue);
    float d = 1.-length(uv);
    d = smoothstep(0., 1., size*d);
    value=floor(value*d + (threshold));
    gl_FragColor = vec4(value*color, 1.);
}
`

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
    time: { type: "f", value: 0 },
    resolution: {
        type: "v2", value: new THREE.Vector2(),
    },
    size: { type: "f", value: 3 },
    threshold: { type: "f", value: 0.35 },
    color: { type: "c", value: new THREE.Color(1, 1, 1) },
};

var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: $('#vert').textContent,
    fragmentShader: frag,
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