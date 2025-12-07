//////////////////////////////////////////////////////////////////////////////
//
//  MVnew.js - Funciones para Vectores y Matrices (WebGL Column-Major)
//
//////////////////////////////////////////////////////////////////////////////

//----------------------------------------------------------------------------
// Helper Functions
//----------------------------------------------------------------------------

function radians( degrees ) {
    return degrees * Math.PI / 180.0;
}

//----------------------------------------------------------------------------
// Vector Constructors
//----------------------------------------------------------------------------

function vec2()
{
    var out = new Array(2);
    out.type = 'vec2';

    switch ( arguments.length ) {
      case 0:
        out[0] = 0.0;
        out[1] = 0.0;
        break;
      case 1:
        if(arguments[0].type == 'vec2') {
          out[0] = arguments[0][0];
          out[1] = arguments[0][1];
        }
        break;
      case 2:
        out[0] = arguments[0];
        out[1] = arguments[1];
        break;
    }
    return out;
}

function vec3()
{
    var out = new Array(3);
    out.type = 'vec3';

    switch ( arguments.length ) {
    case 0:
      out[0] = 0.0;
      out[1] = 0.0;
      out[2] = 0.0;
      return out;
    case 1:
      if(arguments[0].type == "vec3") {
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
        out[2] = arguments[0][2];
        return out;
      }
    case 3:
      out[0] = arguments[0];
      out[1] = arguments[1];
      out[2] = arguments[2];
      return out;
    default:
      throw "vec3: wrong arguments";
    }
}

function vec4()
{
    var out = new Array(4);
    out.type = 'vec4';
    switch ( arguments.length ) {
      case 0:
        out[0] = 0.0;
        out[1] = 0.0;
        out[2] = 0.0;
        out[3] = 0.0;
        return out;
      case 1:
        if(arguments[0].type == "vec4") {
          out[0] = arguments[0][0];
          out[1] = arguments[0][1];
          out[2] = arguments[0][2];
          out[3] = arguments[0][3];
          return out;
        }
        else if(arguments[0].type == "vec3") {
          out[0] = arguments[0][0];
          out[1] = arguments[0][1];
          out[2] = arguments[0][2];
          out[3] = 1.0;
          return out;
        }
      case 4:
        out[0] = arguments[0];
        out[1] = arguments[1];
        out[2] = arguments[2];
        out[3] = arguments[3];
        return out;
      default:
        throw "vec4: wrong arguments";
    }
}

//----------------------------------------------------------------------------
// Matrix Constructors (Column-Major Order for WebGL)
//----------------------------------------------------------------------------

function mat2()
{
    var out = new Array(2);
    out[0] = new Array(2);
    out[1] = new Array(2);

    switch ( arguments.length ) {
    case 0:
        out[0][0] = 1.0;
        out[0][1] = 0.0;
        out[1][0] = 0.0;
        out[1][1] = 1.0;
        break;
    case 4:
        out[0][0] = arguments[0];
        out[0][1] = arguments[1];
        out[1][0] = arguments[2];
        out[1][1] = arguments[3];
        break;
    }
    out.type = 'mat2';
    return out;
}

function mat3()
{
    var out = new Array(3);
    out[0] = new Array(3);
    out[1] = new Array(3);
    out[2] = new Array(3);

    switch ( arguments.length ) {
      case 0:
          out[0][0]=out[1][1]=out[2][2]=1.0;
          out[0][1]=out[0][2]=out[1][0]=out[1][2]=out[2][0]=out[2][1]=0.0;
          break;
      case 9:
          for(var i=0; i<3; i++) for(var j=0; j<3; j++) {
            out[i][j] = arguments[3*i+j];
          }
          break;
    }
    out.type = 'mat3';
    return out;
}

function mat4()
{
    var out = new Array(4);
    out[0] = new Array(4);
    out[1] = new Array(4);
    out[2] = new Array(4);
    out[3] = new Array(4);

    switch ( arguments.length ) {
    case 0:
      out[0][0]=out[1][1]=out[2][2]=out[3][3] = 1.0;
      out[0][1]=out[0][2]=out[0][3]=out[1][0]=out[1][2]=out[1][3]=out[2][0]=out[2][1]
        =out[2][3]=out[3][0]=out[3][1]=out[3][2]=0.0;
      break;
    case 16:
      // Column-major storage: out[col][row]
      for(var i=0; i<4; i++) for(var j=0; j<4; j++) {
        out[i][j] = arguments[i*4+j];
      }
      break;
    }
    out.type = 'mat4';
    return out;
}

//----------------------------------------------------------------------------
// Generic Mathematical Operations
//----------------------------------------------------------------------------

function equal( u, v )
{
    if ( u.type != v.type ) throw "equal: types different";

    if(u.type == 'mat2' || u.type == 'mat3' || u.type == 'mat4') {
        for ( var i = 0; i < u.length; ++i )
            for ( var j = 0; j < u.length; ++j )
                if ( u[i][j] !== v[i][j] )  return false;
        return true;
    }

    if(u.type == 'vec2' || u.type == 'vec3' || u.type == 'vec4') {
        for ( var i = 0; i < u.length; ++i )
            if ( u[i] !== v[i] )  return false;
        return true;
    }
}

function add( u, v )
{
    if ( u.type != v.type ) {
        throw "add(): trying to add different types";
    }

    if(u.type == 'vec2' || u.type == 'vec3' || u.type == 'vec4') {
        var result = new Array(u.length);
        result.type = u.type;
        for(var i=0; i<u.length; i++) {
            result[i] = u[i] + v[i];
        }
        return result;
    }
}

function subtract( u, v )
{
    if ( u.type != v.type ) {
        throw "subtract(): trying to subtract different types";
    }

    if(u.type == 'vec2' || u.type == 'vec3' || u.type == 'vec4') {
        var result = new Array(u.length);
        result.type = u.type;
        for(var i=0; i<u.length; i++) {
            result[i] = u[i] - v[i];
        }
        return result;
    }
}

function mult( u, v )
{
    if(typeof(u)=="number" && v.type) {
        if(v.type == 'vec2' || v.type == 'vec3' || v.type == 'vec4') {
            var result = new Array(v.length);
            result.type = v.type;
            for(var i = 0; i < v.length; i++) {
                result[i] = u * v[i];
            }
            return result;
        }
    }

    if(u.type == 'mat4' && v.type == 'vec4') {
        var result = vec4();
        for(var i = 0; i < 4; i++) {
            result[i] = 0.0;
            for(var k = 0; k < 4; k++)
                result[i] += u[k][i] * v[k]; // Column-major
        }
        return result;
    }

    if(u.type == 'mat4' && v.type == 'mat4') {
        var result = mat4();
        for(var i = 0; i < 4; i++)
            for(var j = 0; j < 4; j++) {
                result[i][j] = 0.0;
                for(var k = 0; k < 4; k++)
                    result[i][j] += u[k][j] * v[i][k]; // Column-major
            }
        return result;
    }

    throw "mult(): incompatible types";
}

//----------------------------------------------------------------------------
// Transformation Matrix Generators
//----------------------------------------------------------------------------

function translate( x, y, z )
{
    if(arguments.length != 3) {
        throw "translate(): requires 3 arguments";
    }

    var result = mat4();
    result[3][0] = x;
    result[3][1] = y;
    result[3][2] = z;
    return result;
}

function rotate( angle, axis )
{
    if ( axis.length == 3 ) {
        axis = vec3(axis[0], axis[1], axis[2] );
    }

    if(axis.type != 'vec3') throw "rotate: axis not a vec3";

    var v = normalize( axis );
    var x = v[0];
    var y = v[1];
    var z = v[2];

    var c = Math.cos( radians(angle) );
    var omc = 1.0 - c;
    var s = Math.sin( radians(angle) );

    var result = mat4(
        x*x*omc + c,     x*y*omc - z*s,   x*z*omc + y*s,   0.0,
        x*y*omc + z*s,   y*y*omc + c,     y*z*omc - x*s,   0.0,
        x*z*omc - y*s,   y*z*omc + x*s,   z*z*omc + c,     0.0,
        0.0,             0.0,             0.0,             1.0
    );
    return result;
}

function scale( x, y, z )
{
    if(arguments.length != 3) {
        throw "scale(): requires 3 arguments";
    }

    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    return result;
}

//----------------------------------------------------------------------------
// ModelView Matrix Generators
//----------------------------------------------------------------------------

function lookAt( eye, at, up )
{
    if ( eye.type != 'vec3') {
        throw "lookAt(): first parameter [eye] must be a vec3";
    }

    if ( at.type != 'vec3') {
        throw "lookAt(): second parameter [at] must be a vec3";
    }

    if (up.type != 'vec3') {
        throw "lookAt(): third parameter [up] must be a vec3";
    }

    if ( equal(eye, at) ) {
        return mat4();
    }

    var v = normalize( subtract(at, eye) );  // view direction vector
    var n = normalize( cross(v, up) );       // perpendicular vector
    var u = normalize( cross(n, v) );        // "new" up vector
    v = negate( v );

    // Column-major order
    var result = mat4(
        n[0], u[0], v[0], 0.0,
        n[1], u[1], v[1], 0.0,
        n[2], u[2], v[2], 0.0,
        -dot(n, eye), -dot(u, eye), -dot(v, eye), 1.0
    );

    return result;
}

//----------------------------------------------------------------------------
// Projection Matrix Generators
//----------------------------------------------------------------------------

function ortho( left, right, bottom, top, near, far )
{
    if ( left == right ) { throw "ortho(): left and right are equal"; }
    if ( bottom == top ) { throw "ortho(): bottom and top are equal"; }
    if ( near == far )   { throw "ortho(): near and far are equal"; }

    var w = right - left;
    var h = top - bottom;
    var d = far - near;

    // Column-major order
    var result = mat4();
    result[0][0] = 2.0 / w;
    result[1][1] = 2.0 / h;
    result[2][2] = -2.0 / d;
    result[3][0] = -(left + right) / w;
    result[3][1] = -(top + bottom) / h;
    result[3][2] = -(near + far) / d;

    return result;
}

function perspective( fovy, aspect, near, far )
{
    var f = 1.0 / Math.tan( radians(fovy) / 2 );
    var d = far - near;

    // Column-major order
    var result = mat4();
    result[0][0] = f / aspect;
    result[1][1] = f;
    result[2][2] = -(near + far) / d;
    result[3][2] = -1;
    result[2][3] = -2 * near * far / d;
    result[3][3] = 0.0;

    return result;
}

//----------------------------------------------------------------------------
// Matrix Functions
//----------------------------------------------------------------------------

function transpose( m )
{
    if(m.type == 'mat4') {
        var result = mat4(
            m[0][0], m[0][1], m[0][2], m[0][3],
            m[1][0], m[1][1], m[1][2], m[1][3],
            m[2][0], m[2][1], m[2][2], m[2][3],
            m[3][0], m[3][1], m[3][2], m[3][3]
        );
        return result;
    }

    throw "transpose(): not a matrix";
}

//----------------------------------------------------------------------------
// Vector Functions
//----------------------------------------------------------------------------

function dot( u, v )
{
    if ( u.type != v.type ) {
        throw "dot(): types are not the same";
    }

    var sum = 0.0;
    for ( var i = 0; i < u.length; i++ ) {
        sum += u[i] * v[i];
    }
    return sum;
}

function negate( u )
{
    var result = new Array(u.length);
    result.type = u.type;
    for ( var i = 0; i < u.length; ++i ) {
        result[i] = -u[i];
    }
    return result;
}

function cross( u, v )
{
    if ( u.type == 'vec3' && v.type == 'vec3') {
        var result = vec3(
            u[1]*v[2] - u[2]*v[1],
            u[2]*v[0] - u[0]*v[2],
            u[0]*v[1] - u[1]*v[0]
        );
        return result;
    }

    throw "cross: types aren't vec3";
}

function length( u )
{
    return Math.sqrt( dot(u, u) );
}

function normalize( u )
{
    if(u.type != 'vec3' && u.type != 'vec4' && u.type != 'vec2') {
        throw "normalize: not a vector type";
    }

    var len = length(u);
    var result = new Array(u.length);
    result.type = u.type;

    for(var i = 0; i < u.length; i++) {
        result[i] = u[i] / len;
    }

    return result;
}

function mix( u, v, s )
{
    if ( typeof(s) !== "number" ) {
        throw "mix: the last parameter must be a number";
    }

    var result = new Array(u.length);
    result.type = u.type;

    for ( var i = 0; i < u.length; ++i ) {
        result[i] = (1.0 - s) * u[i] + s * v[i];
    }

    return result;
}

//----------------------------------------------------------------------------
// Utility Functions
//----------------------------------------------------------------------------

function flatten( v )
{
    if(v.type == 'vec2' || v.type == 'vec3' || v.type == 'vec4') {
        var floats = new Float32Array(v.length);
        for(var i = 0; i < v.length; i++)
            floats[i] = v[i];
        return floats;
    }

    if(v.type == 'mat2' || v.type == 'mat3' || v.type == 'mat4') {
        // Flatten in column-major order for WebGL
        var floats = new Float32Array(v.length * v.length);
        for(var i = 0; i < v.length; i++)
            for(var j = 0; j < v.length; j++) {
                floats[i * v.length + j] = v[i][j];
            }
        return floats;
    }

    throw "flatten: not a vector or matrix";
}
