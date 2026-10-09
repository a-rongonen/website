import { createDepthOrder, type Point3D, type Edge } from './cv-network-scene';

export type NetworkView = {
  width: number; height: number; pixelRatio: number;
  cameraDistance: number; cameraY: number; anchorY: number; focalLength: number;
  sin: number; cos: number; depthExtent: number; depthDarkening: number;
  repeatHeight: number; unitScale: number; staticProjection: boolean;
  firstRow: number; rowCount: number; lineWidth: number; nodeSize: number;
};
export type NetworkBand = { top: number; height: number; rgb: number[]; previousRgb: number[]; transition: number; invisible: boolean };

const projection = `
uniform vec2 u_viewport;
uniform float u_camera, u_cameraY, u_anchorY, u_focal, u_repeat, u_unitScale;
uniform vec2 u_rotation;
uniform float u_static, u_firstRow, u_depthExtent, u_darkening, u_pixelRatio;
vec3 project(vec3 point, float rowOffset) {
  float x = point.x * u_rotation.y + point.z * u_rotation.x;
  float z = point.z * u_rotation.y - point.x * u_rotation.x;
  float scale = u_focal / max(1.0, u_camera - z);
  float row = u_firstRow + rowOffset;
  float y = u_anchorY + (point.y - u_cameraY) * scale
    + row * u_repeat * mix(scale, u_unitScale, u_static);
  return vec3(u_viewport.x * .5 + x * scale, y, scale);
}
float brightness(vec3 point) {
  float z = point.z * u_rotation.y - point.x * u_rotation.x;
  return 1.0 - u_darkening * clamp((u_depthExtent - z) / max(1.0, 2.0 * u_depthExtent), 0.0, 1.0);
}
vec4 clipPosition(vec2 point) {
  return vec4(point.x / u_viewport.x * 2.0 - 1.0, 1.0 - point.y / u_viewport.y * 2.0, 0.0, 1.0);
}
`;

const lineVertex = `#version 300 es
precision highp float;
in vec3 a_start, a_end;
in vec2 a_corner;
in float a_endRow;
uniform float u_lineWidth;
out float v_brightness, v_side, v_along, v_length;
${projection}
void main() {
  vec3 start = project(a_start, float(gl_InstanceID)), end = project(a_end, float(gl_InstanceID) + a_endRow);
  vec2 delta = end.xy - start.xy;
  float segmentLength = max(length(delta), .001);
  vec2 direction = delta / segmentLength;
  float padding = u_lineWidth * .5 + .75 / u_pixelRatio;
  float along = mix(-padding, segmentLength + padding, a_corner.x);
  vec2 point = start.xy + direction * along + vec2(-direction.y, direction.x) * a_corner.y * padding;
  gl_Position = clipPosition(point);
  v_brightness = mix(brightness(a_start), brightness(a_end), a_corner.x);
  v_side = a_corner.y * padding;
  v_along = along;
  v_length = segmentLength;
}`;

const paletteFragment = `
uniform vec3 u_color, u_previousColor;
uniform vec2 u_viewport;
uniform float u_bandTop, u_transition, u_pixelRatio;
vec3 sectionColor() {
  float y = u_viewport.y - gl_FragCoord.y / u_pixelRatio;
  float t = u_transition > 0.0 ? clamp((y - u_bandTop) / u_transition, 0.0, 1.0) : 1.0;
  return mix(u_previousColor, u_color, t);
}
`;

const lineFragment = `#version 300 es
precision highp float;
${paletteFragment}
uniform float u_lineWidth;
in float v_brightness, v_side, v_along, v_length;
out vec4 outputColor;
void main() {
  float cap = max(max(-v_along, v_along - v_length), 0.0);
  float distance = length(vec2(v_side, cap));
  float aa = .75 / u_pixelRatio;
  float alpha = 1.0 - smoothstep(u_lineWidth * .5 - aa, u_lineWidth * .5 + aa, distance);
  outputColor = vec4(sectionColor() * v_brightness, alpha);
}`;

const nodeVertex = `#version 300 es
precision highp float;
in vec3 a_point;
uniform float u_nodeSize, u_maxPointSize;
out float v_brightness, v_radius, v_size;
${projection}
void main() {
  vec3 point = project(a_point, float(gl_VertexID));
  float radius = u_nodeSize * clamp(point.z, .4, 2.5) * u_pixelRatio;
  gl_Position = clipPosition(point.xy);
  gl_PointSize = min(u_maxPointSize, 2.0 * radius + 2.0);
  v_size = gl_PointSize;
  v_radius = min(radius, (u_maxPointSize - 2.0) * .5);
  v_brightness = brightness(a_point);
}`;

const nodeFragment = `#version 300 es
precision highp float;
${paletteFragment}
in float v_brightness, v_radius, v_size;
out vec4 outputColor;
void main() {
  float distance = length((gl_PointCoord - .5) * v_size);
  float alpha = 1.0 - smoothstep(v_radius - .75, v_radius + .75, distance);
  outputColor = vec4(sectionColor() * v_brightness, alpha);
}`;

/** Geometry stays on the GPU; only optional rotation changes the node ordering. */
export function createNetworkGpu(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) return null;

  const programs: WebGLProgram[] = [];
  const buffers: WebGLBuffer[] = [];
  const arrays: WebGLVertexArrayObject[] = [];
  const shaders: WebGLShader[] = [];
  const dispose = () => {
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    arrays.forEach(array => gl.deleteVertexArray(array));
    programs.forEach(program => gl.deleteProgram(program));
    shaders.forEach(shader => gl.deleteShader(shader));
  };
  try {
    function program(vertex: string, fragment: string) {
      const result = gl!.createProgram();
      if (!result) throw new Error('Unable to create network shader program');
      programs.push(result);
      for (const [kind, source] of [[gl!.VERTEX_SHADER, vertex], [gl!.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl!.createShader(kind);
        if (!shader) throw new Error('Unable to create network shader');
        shaders.push(shader);
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Network shader compilation failed');
        gl!.attachShader(result, shader);
      }
      gl!.linkProgram(result);
      if (!gl!.getProgramParameter(result, gl!.LINK_STATUS)) throw new Error('Network shader linking failed');
      const names = ['viewport', 'camera', 'cameraY', 'anchorY', 'focal', 'repeat', 'unitScale',
        'rotation', 'static', 'firstRow', 'depthExtent', 'darkening', 'pixelRatio',
        'lineWidth', 'nodeSize', 'maxPointSize', 'color', 'previousColor', 'bandTop', 'transition'];
      const uniforms = Object.fromEntries(names.map(name => [name, gl!.getUniformLocation(result, 'u_' + name)]));
      const vao = gl!.createVertexArray();
      const buffer = gl!.createBuffer();
      if (!vao || !buffer) throw new Error('Unable to allocate network geometry');
      arrays.push(vao);
      buffers.push(buffer);
      return { program: result, uniforms, vao, buffer };
    }
    const lines = program(lineVertex, lineFragment);
    const nodes = program(nodeVertex, nodeFragment);
    let nodeCount = 0;
    let nodePoints: Point3D[] = [];
    let depthOrder = createDepthOrder(nodePoints);
    let uploadedOrder: number[] = [];
    let nodeVertices = new Float32Array(0);
    let lineVertices = 0;
    const maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] as number;

    function attribute(program: WebGLProgram, name: string, size: number, stride: number, offset: number) {
      const location = gl!.getAttribLocation(program, name);
      gl!.enableVertexAttribArray(location);
      gl!.vertexAttribPointer(location, size, gl!.FLOAT, false, stride, offset);
    }

    function writeNodeVertices(order: number[]) {
      order.forEach((index, i) => {
        const point = nodePoints[index];
        nodeVertices[i * 3] = point.x;
        nodeVertices[i * 3 + 1] = point.y;
        nodeVertices[i * 3 + 2] = point.z;
      });
    }

    function setGeometry(points: Point3D[], edges: Edge[]) {
      nodeCount = points.length;
      nodePoints = points;
      depthOrder = createDepthOrder(points);
      uploadedOrder = depthOrder(0, 1);
      nodeVertices = new Float32Array(points.length * 3);
      writeNodeVertices(uploadedOrder);
      lineVertices = edges.length * 6;
      gl!.bindVertexArray(nodes.vao);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, nodes.buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER, nodeVertices, gl!.STATIC_DRAW);
      attribute(nodes.program, 'a_point', 3, 12, 0);
      // Draw every vertical copy of a far node before advancing to a nearer node.
      gl!.vertexAttribDivisor(gl!.getAttribLocation(nodes.program, 'a_point'), 1);

      const vertices = new Float32Array(lineVertices * 9);
      let offset = 0;
      const corners = [[0, -1], [1, -1], [0, 1], [0, 1], [1, -1], [1, 1]];
      for (const edge of edges) {
        const a = points[edge.from], b = points[edge.to];
        for (const [along, side] of corners) {
          vertices.set([a.x, a.y, a.z, b.x, b.y, b.z, along, side, edge.toRowOffset], offset);
          offset += 9;
        }
      }
      gl!.bindVertexArray(lines.vao);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, lines.buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER, vertices, gl!.STATIC_DRAW);
      attribute(lines.program, 'a_start', 3, 36, 0);
      attribute(lines.program, 'a_end', 3, 36, 12);
      attribute(lines.program, 'a_corner', 2, 36, 24);
      attribute(lines.program, 'a_endRow', 1, 36, 32);
      gl!.bindVertexArray(null);
    }

    function render(view: NetworkView, bands: NetworkBand[], scrollY: number) {
      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.disable(gl!.SCISSOR_TEST);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      if (!nodeCount) return;
      const order = depthOrder(view.sin, view.cos);
      if (order !== uploadedOrder) {
        writeNodeVertices(order);
        gl!.bindBuffer(gl!.ARRAY_BUFFER, nodes.buffer);
        gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, nodeVertices);
        uploadedOrder = order;
      }
      gl!.enable(gl!.BLEND);
      gl!.blendFuncSeparate(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA, gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
      gl!.enable(gl!.SCISSOR_TEST);
      for (const item of [lines, nodes]) {
        const isLine = item === lines;
        if ((isLine ? view.lineWidth : view.nodeSize) === 0) continue;
        gl!.useProgram(item.program);
        gl!.bindVertexArray(item.vao);
        const u = item.uniforms;
        gl!.uniform2f(u.viewport, view.width, view.height);
        gl!.uniform2f(u.rotation, view.sin, view.cos);
        for (const [name, value] of Object.entries({
          camera: view.cameraDistance, cameraY: view.cameraY, anchorY: view.anchorY,
          focal: view.focalLength, repeat: view.repeatHeight, unitScale: view.unitScale,
          static: Number(view.staticProjection), firstRow: view.firstRow,
          depthExtent: view.depthExtent, darkening: clamp01(view.depthDarkening),
          pixelRatio: view.pixelRatio, lineWidth: view.lineWidth, nodeSize: view.nodeSize, maxPointSize,
        })) gl!.uniform1f(u[name], value);
        for (const band of bands) {
          const top = Math.max(0, band.top - scrollY);
          const bottom = Math.min(view.height, band.top + band.height - scrollY);
          if (bottom <= top || band.invisible) continue;
          const first = Math.round(top * view.pixelRatio);
          const last = Math.round(bottom * view.pixelRatio);
          gl!.scissor(0, canvas.height - last, canvas.width, last - first);
          gl!.uniform3f(u.color, band.rgb[0] / 255, band.rgb[1] / 255, band.rgb[2] / 255);
          gl!.uniform3f(u.previousColor, band.previousRgb[0] / 255, band.previousRgb[1] / 255, band.previousRgb[2] / 255);
          gl!.uniform1f(u.bandTop, band.top - scrollY);
          gl!.uniform1f(u.transition, band.transition);
          gl!.drawArraysInstanced(isLine ? gl!.TRIANGLES : gl!.POINTS, 0,
            isLine ? lineVertices : view.rowCount, isLine ? view.rowCount : nodeCount);
        }
      }
      gl!.bindVertexArray(null);
      gl!.disable(gl!.SCISSOR_TEST);
    }
    return { setGeometry, render, dispose };
  } catch {
    dispose();
    return null;
  }
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
