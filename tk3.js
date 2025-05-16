/////////////////////////////////////SETUP LAND////////////////////////////////

function tk3_setup_canvas(id) {
	var gl = document.getElementById(id).getContext("webgl2");
	gl.enable(gl.DEPTH_TEST);
	return(gl);
	}

function tk3_clear(gl) {
	gl.clearColor(0,0,0,0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

////////////////////////////////////END SETUP LAND////////////////////////////

///////////////////////////////////UNIVERSALS LAND////////////////////////////

function remap(imin,imax,omin,omax,t) {
	return(omin + (t-imin) * (omax-omin)/(imax-imin));
	}

///////////////////////////////////END UNIVERSALS LAND///////////////////////////


/////////////////////////////////////BEGIN SHADER CODE///////////////////////////////
function tk3_shader_error(type, source, error) {
	if (typeof source != "string") {return("Shader Failed Entirely");}
	var i;
	var errorlinelist = {};
	var l = error.split("\n");
	for (i = 0; i < l.length; i++) {
		var k = l[i].split(" ");
		if (k[0] == "ERROR:") {
			var k = k[1].split(":");
			errorlinelist[k[1]] = true;
			}
		}
	var typestr = "Error in Shader Type " + type + ":\n";
	if (type == "vertex") {typestr = "Error in Vertex Shader:\n";}
	if (type == "fragment") {typestr = "Error in Fragment Shader:\n";}
	var rval = typestr + error;
	rval = "<div class='alert' style='width:40vh;white-space:pre-wrap'>" + rval + "</div>"
	l = source.split("\n");
	rval += "<table style='border-spacing:0px;'>";
	for (i = 0; i < l.length; i++) {
		rval += "<tr style='line-height:1em'><td style='text-align:right;"
		if (i+1 in errorlinelist) {
			rval += "background-color:#ffcccc";
			}
		rval += "'>" + (i+1) + ":</td><td style='padding-left:.5em'>" + l[i] + "</td></tr>";
		}
	rval += "</table>";
	return(rval);
	}

function tk3_compile_vshader(gl, str) {
	var vshader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vshader, str);
	gl.compileShader(vshader);
	var success = gl.getShaderParameter(vshader, gl.COMPILE_STATUS);
	if (!success) {
		displayerror(tk3_shader_error("vertex", str, gl.getShaderInfoLog(vshader)));
		gl.deleteShader(vshader);
		return;
		}
	return(vshader);
	}

function tk3_compile_fshader(gl, str) {
	var fshader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fshader, str);
	gl.compileShader(fshader);
	var success = gl.getShaderParameter(fshader, gl.COMPILE_STATUS);
	if (!success) {
		displayerror(tk3_shader_error("fragment", str, gl.getShaderInfoLog(fshader)));
		gl.deleteShader(fshader);
		return;
		}
	return(fshader);
	}

function tk3_merge_shaders_to_stron(gl, vshader,fshader) {
	var prog = gl.createProgram();
	gl.attachShader(prog, vshader);
	gl.attachShader(prog, fshader);
	gl.linkProgram(prog);
	var success = gl.getProgramParameter(prog, gl.LINK_STATUS);
	if (!success) {
		displayerror(gl.getProgramInfoLog(prog));
		gl.deleteProgram(prog);
		return;
		}
	
	var alocs = {};
	var n = gl.getProgramParameter(prog,gl.ACTIVE_ATTRIBUTES);
	var i;
	for (i = 0; i < n; i++) {
		var name = gl.getActiveAttrib(prog,i).name;
		alocs[name] = gl.getAttribLocation(prog,name); 
		}

	var ulocs = {};
	var n = gl.getProgramParameter(prog,gl.ACTIVE_UNIFORMS);
	var i;
	for (i = 0; i < n; i++) {
		var name = gl.getActiveUniform(prog,i).name;
		ulocs[name] = gl.getUniformLocation(prog,name); 
		}
	
	var rval = {
		program: prog,
		alocs: alocs,
		ulocs: ulocs
		};
	return(rval);
	}

function tk3_sdat_to_stron(gl, sdi) {
	var vshader = tk3_compile_vshader(gl, sdi.vs);
	if (!vshader) {return;}
	var fshader = tk3_compile_fshader(gl, sdi.fs);
	if (!fshader) {return;}
	var rval = tk3_merge_shaders_to_stron(gl, vshader,fshader);
	return(rval);
	}

////////////////////////////END SHADER CODE////////////////////////////////

////////////////////////////BEGIN BUILT-IN SHADERS///////////////////////////

var tk3_fs_mango = `#version 300 es

precision highp float;
in vec2 uvCoords;
out vec4 outColor;

void main() {
	outColor = vec4(uvCoords,0,1);
	}`

var tk3_vs_square = `#version 300 es
in vec2 uv;
out vec2 uvCoords;
void main() {
	uvCoords = uv;
	gl_Position = vec4(2.0*uv-1.0,0,1);
	}`

////////////////////////////END BUILT-IN SHADERS////////////////////////////

////////////////////////////BEGIN ATTRIB CODE//////////////////////////////

function tk3_attribute_flatten(l) {//todo: case handle if the members of l are different lengths (pad them all to the max length)
	var rval = [];
	for (var i = 0; i < l.length; i++) {
		if (Array.isArray(l[i])) {
			for (var j = 0; j < l[i].length; j++) {
				rval.push(l[i][j]);
				}
			}
		else {
			rval.push(l[i]);
			}
		}
	return(rval);
	}

function tk3_adat_to_atron(gl, adi, sti, mode) {
	if (typeof mode === 'undefined') {mode = gl.TRIANGLES}
	var VAO = gl.createVertexArray();
	gl.bindVertexArray(VAO);
	var an;
	var numv = 0;
	for (an in adi) {
		numv = Math.max(numv, adi[an].length);
		if (!(an in sti.alocs)) {
			console.log("tk3_adat_to_atron: " + an + " not registered");
			}
		else {
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
			var dat = new Float32Array(tk3_attribute_flatten(adi[an]));
			gl.bufferData(gl.ARRAY_BUFFER, dat, gl.STATIC_DRAW);
			var size = 1;
			if (Array.isArray(adi[an])) {size = adi[an][0].length;}
			gl.enableVertexAttribArray(sti.alocs[an]);
			gl.vertexAttribPointer(sti.alocs[an], size, gl.FLOAT, false, 0, 0);
			}
		}
	var rval = {
		VAO:VAO,
		numv: numv,
		mode: mode,
		stron: sti
		}
	return(rval);
	}

function tk3_draw_atron(gl, ati, mode) {
	if (typeof mode === 'undefined') {mode = ati.mode}
	if ("stron" in ati) {gl.useProgram(ati.stron.program);} //for compatibility. old version of tk3.js did not store the stron in the atron
	gl.bindVertexArray(ati.VAO);
	gl.drawArrays(ati.mode, 0, ati.numv);
	}

//////////////////////////////////END ATTRIB CODE//////////////////////////////////

///////////////////////////////BEGIN BUILT-IN MODELS//////////////////////////////////



////////////////////////////////END BUILT-IN MODELS/////////////////////////////////

//////////////////////////////////BEGIN MATRIX CODE/////////////////////////////////

var tk3_mat_id = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

function tk3_mat4_scale(s) {
	return([[s,0,0,0],
		[0,s,0,0],
		[0,0,s,0],
		[0,0,0,1]]);
	}

function tk3_mat4_trans(x,y,z) {
	return([[1,0,0,x],
		[0,1,0,y],
		[0,0,1,z],
		[0,0,0,1]]);
	}

function tk3_mat4_rotx(th) {
	var c = Math.cos(th);
	var s = Math.sin(th);
	return([[1,0,0,0],
		[0,c,-s,0],
		[0,s,c,0],
		[0,0,0,1]]);
	}

function tk3_mat4_roty(th) {
	var c = Math.cos(th);
	var s = Math.sin(th);
	return([[c,0,s,0],
		[0,1,0,0],
		[-s,0,c,0],
		[0,0,0,1]]);
	}

function tk3_mat4_rotz(th) {
	var c = Math.cos(th);
	var s = Math.sin(th);
	return([[c,s,0,0],
		[-s,c,0,0],
		[0,0,1,0],
		[0,0,0,1]]);
	}

function tk3_mat4_zoom_ortho(z) {
	return(tk3_mat4_scale(1/z));
	}

function tk3_mat4_zoom_persp(z) {
	return(tk3_mat4_trans(0,0,-z));
	}

function tk3_mat4_persp(fovinradians, aspect, near, far) { //see https://unspecified.wordpress.com/2012/06/21/calculating-the-gluperspective-matrix-and-other-opengl-matrix-maths/
	var f = Math.tan(Math.PI * 0.5 - 0.5 * fovinradians);
	return([[f/aspect, 0, 0, 0],
		[0, f, 0, 0],
		[0, 0, (far+near)/(near-far), 2*far*near/(near-far)],
		[0,0,-1,0]]);
	}

function tk3_mat4_ortho(left, right, bottom, top, near, far) {
	return([[2/(right-left), 0, 0, -(right+left)/(right-left)],
		[0, 2/(top-bottom), 0, -(top+bottom)/(top-bottom)],
		[0, 0, -2/(far-near), -(far+near)/(far-near)],
		[0,0,0,1]]);
	}

function tk3_mat_multiply(a,b) {
	if (a[0].length != b.length) {console.log("tk3_mat_multiply error: dimension mismatch", a, b);}
	var i, j, k;
	var rval = [];
	for (i = 0; i < a.length; i++) {
		rval.push([]);
		for (j = 0; j < b[0].length; j++) {
			rval[i].push(0);
			for (k = 0; k < a[0].length; k++) {
				rval[i][j] = rval[i][j] + (a[i][k] * b[k][j]);
				}
			}
		}
	return(rval);
	}

function tk3_mat_multiply_list(...l) {
	if (l.length == 0) {console.log("tk3_mat_multiply_list error: list must not be empty");}
	var rval = l[0];
	var i;
	for (i = 1; i < l.length; i++) {
		rval = tk3_mat_multiply(rval,l[i]);
		}
	return(rval);
	}

function tk3_mat_apply(m,v) {
	if (m[0].length != v.length) {console.log("tk3_mat_apply error: dimension mismatch", m, v);}
	var rval = [];
	var i;
	for (i = 0; i < m.length; i++) {
		rval.push(0);
		for (j = 0; j < m[0].length; j++) {
			rval[i] = rval[i] + (m[i][j] * v[j]);
			}
		}
	return(rval);
	}

function tk3_mat_apply_list(...l) {
	var m = tk3_mat_multiply_list(...(l.slice(0,-1)));
	return(tk3_mat_apply(m,l[l.length-1]));
	}

function tk3_mat_transpose(m) {
	var i, j;
	var rval = [];
	for (i = 0; i < m[0].length; i++) {
		rval.push([]);
		for (j = 0; j < m.length; j++) {
			rval[i].push(m[j][i]);
			}
		}
	return(rval);
	}

function tk3_mat2_determinant(m) {
	return(m[0][0]*m[1][1]-m[0][1]*m[1][0]);
	}

function tk3_mat3_determinant(m) {
	return(m[0][0]*m[1][1]*m[2][2]+m[0][1]*m[1][2]*m[2][0]+m[0][2]*m[1][0]*m[2][1]-m[0][2]*m[1][1]*m[2][0]-m[0][1]*m[1][0]*m[2][2]-m[0][0]*m[1][2]*m[2][1]);
	}

function tk3_linear_combo(...l) { //assumes: l is of the form a,v,a,v,a,v, all vs the same length, at least one pair
	var rval = [];
	var i,j;
	for (i = 0; i < l[1].length; i++) {
		rval.push(0);
		}
	for (i = 0; i < l.length; i += 2) {
		for (j = 0; j < rval.length; j++) {
			rval[j] += l[i]*l[i+1][j];
			}
		}
	return(rval);
	}

function tk3_vector_length(v) {
	var i;
	var rvalsq = 0;
	for (i = 0; i < v.length; i++) {
		rvalsq += v[i]*v[i];
		}
	return(Math.sqrt(rvalsq));
	}

function tk3_vector_distance(v1,v2) {
	var i;
	var rvalsq = 0;
	for (i = 0; i < v1.length; i++) {
		rvalsq += (v1[i]-v2[i])*(v1[i]-v2[i]);
		}
	return(Math.sqrt(rvalsq));
	}

////////////////////END MATRIX CODE////////////////////////

////////////////////BEGIN WIDGET CODE///////////////////////

var tk3_global_widget_registry = {};
var tk3_global_widget_latest_name = ""; //if renaming happened at initialization, here's where you'll find out.

function tk3_get_free_widget_name(bname) {
	if (!(bname in tk3_global_widget_registry)) {return(bname);}
	var i;
	for (i = 0; true; i++) {
		if (!(bname+""+i in tk3_global_widget_registry)) {return(bname+""+i);}
		}
	}

function tk3_widget_slider_string(wdi,i) {
	var val = wdi.value;
	if (["slider_2f","slider_3f","slider_4f"].indexOf(wdi.type) != -1) {val = wdi.value[i]}
	var str = "";
	str += "<input type='range'";
	str += " min=" + wdi.min;
	str += " max=" + wdi.max;
	str += " step=" + wdi.step;
	str += " value=" + val;
	str += " id='tk3_widget_"+wdi.name+"_slider"+i+"'";
	str += " style='vertical-align:middle'";
	str += " oninput='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
	str += ">";
	str += "<input type='number'";
	str += " step=" + wdi.step;
	str += " value=" + val;
	str += " style='width:4em; vertical-align:middle'";
	str += " id='tk3_widget_"+wdi.name+"_number"+i+"'";
	str += " oninput='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
	str += " onchange='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
	str += ">";
	return(str);
	}

function tk3_parse_color_string_to_rgb(v) {
	var r = parseInt(v[1]+v[2],16);
	var g = parseInt(v[3]+v[4],16);
	var b = parseInt(v[5]+v[6],16);
	return([r/255,g/255,b/255]);
	}

function tk3_parse_rgb_to_color_string(vi) {
	var v = [Math.max(0,Math.min(1,vi[0])),Math.max(0,Math.min(1,vi[1])),Math.max(0,Math.min(1,vi[2]))];
	var str = "#";
	var i;
	for (i = 0; i < 3; i++) {
		var x = Math.round(255*v[i]).toString(16);
		if (x.length == 1) {x = "0"+x;}
		str += x;
		}
	return(str);
	}

function tk3_widget_color_string(wdi) {
	var str = "";
	str = "<input type='color'";
	str += " id='tk3_widget_"+wdi.name+"_color'";
	str += " value='"+tk3_parse_rgb_to_color_string(wdi.value)+"'";
	str += " oninput='tk3_widget_oninput(\""+wdi.name+"\", event, -1)'";
	str += ">";
	var i;
	for (i = 0; i < 4; i++) {
		str += "<input type='number'";
		str += " id='tk3_widget_"+wdi.name+"_number"+i+"'";
		str += " min=0 max=1";
		if (i < 3) {str += " step="+5/255;}
		else {str += " step=0.02";}
		str += " value=" + wdi.value[i];
		str += " style='width:4em'";
		str += " oninput='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
		str += " onchange='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
		str += ">";
		}
	return(str);
	}

function tk3_widget_square_draw(name) {
	var wdi = tk3_global_widget_registry[name];
	var value = wdi.value;
	var topcoord = ((1-wdi.value[1]) * wdi.size)-wdi.radius;
	var leftcoord = (wdi.value[0] * wdi.size)-wdi.radius;

	document.getElementById("tk3_widget_"+name+"_dot").style.top = topcoord + "px";
	document.getElementById("tk3_widget_"+name+"_dot").style.left = leftcoord + "px";
	}

function tk3_widget_square_string(wdi) {
	var topcoord = ((1-wdi.value[1]) * wdi.size)-wdi.radius;
	var leftcoord = (wdi.value[0] * wdi.size)-wdi.radius;
	var str = "<div style='display:inline-block' onpointermove='tk3_widget_oninput(\""+wdi.name+"\",event,-2)' id='tk3_widget_"+wdi.name+"_container' onpointerdown='tk3_widget_oninput(\""+wdi.name+"\", event, -1)' >";
	str += "<div style='border:1px solid #8f8f8f;margin:"+wdi.radius+"px;border-radius:3px;width:"+wdi.size+"px;height:"+wdi.size+"px;background-color:#E9E9E9;position:static;pointer-events:none'>"
	str += "<span style='display:inline-block;position:relative;width:"+(2*(wdi.radius-2))+"px;height:"+(2*(wdi.radius-2))+"px;background-color:#0060DF;border-radius:"+(wdi.radius)+"px;border:2px solid white;box-shadow:1px 2px 3px gray;top:"+topcoord+"px;left:"+leftcoord+"px;pointer-events:none' id='tk3_widget_"+wdi.name+"_dot''></span>";
	str += "</div>";
	str += "</div><br>";
	var i;
	for (i = 0; i < 2; i++) {
		str += "<input type='number'";
		str += " id='tk3_widget_"+wdi.name+"_number"+i+"'";
		str += " min=0 max = 1 step=0.02";
		str += " value=" + wdi.value[i];
		str += " style='width:4em";
		if (i == 0) {str += ";margin-left:"+wdi.radius+"px;"}
		str += "'";
		str += " oninput='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
		str += " onchange='tk3_widget_oninput(\""+wdi.name+"\", event, "+i+")'";
		str += ">";
		}
	return(str);
	}

function tk3_widget_array_string(wdi) {
	var str = "<textarea id='tk3_widget_"+wdi.name+"_textarea' onchange='tk3_widget_oninput(\""+wdi.name+"\",event)'>";
	var val = wdi.string;
	requestAnimationFrame(function() {document.getElementById("tk3_widget_"+wdi.name+"_textarea").value = val});
	return(str);
	}

var tk3_default_widgets = {
	//in addition to the settings below, all widgets offer:
	//-oninput: function to be called after set value is called when input happens
	slider_1f: {
		min: 0,
		max: 1,
		step: 0.01,
		value: 0,
		},
	slider_2f: {
		min: 0,
		max: 1,
		step: 0.01,
		value: [0,0],
		},
	slider_3f: {
		min: 0,
		max: 1,
		step: 0.01,
		value: [0,0,0],
		},
	slider_4f: {
		min: 0,
		max: 1,
		step: 0.01,
		value: [0,0,0,0],
		},
	color: {
		value: [0,0,0,1],
		},
	square: {
		value: [0,0],
		size: 150,
		radius: 11
		},
	array: {
		value: [.2,.3,.4,.6,.5,.1,.3,.8],
		string: ".2,.3\n.4,.6\n.5,.1\n.3,.8",
		elementtype: "float",
		}
	};

function tk3_clean_data(data) {
	try {return(JSON.parse(JSON.stringify(data)))}
	catch {return(data)}
	}

function tk3_clean_wdat(wdi, options) {
	var rval = {};
	var i;
	var name = "widget";
	if ("name" in wdi) {name = wdi.name}
	var displayname = name;
	if ("displayname" in wdi) {displayname = wdi.displayname}
	if (!(options && options.overwrite)) {
		name = tk3_get_free_widget_name(name);
		}
	rval = {};
	var k;
	for (k in tk3_default_widgets[wdi.type]) {
		rval[k] = tk3_clean_data(tk3_default_widgets[wdi.type][k]);
		}
	for (k in wdi) {
		rval[k] = tk3_clean_data(wdi[k]);
		}
	rval.name = name;
	rval.displayname = displayname;
	return(rval);
	}

function tk3_widget_string_and_register(wdii, options) {
	var wdi = tk3_clean_wdat(wdii, options);
	tk3_global_widget_latest_name = wdi.name;
	tk3_global_widget_registry[wdi.name] = wdi;
	var rval = "";
	if (wdi.type == "slider_1f") {
		rval = tk3_widget_slider_string(wdi,0);
		}
	if (["slider_2f","slider_3f","slider_4f"].indexOf(wdi.type) != -1) {
		var k = Number(wdi.type[7]);
		var i;
		for (i = 0; i < k; i++) {
			if (i > 0) {rval += "<br>"}
			rval += tk3_widget_slider_string(wdi,i);
			}
		}
	if (wdi.type == "color") {
		rval = tk3_widget_color_string(wdi);
		}
	if (wdi.type == "square") {
		rval = tk3_widget_square_string(wdi);
		}
	if (wdi.type == "array") {
		rval = tk3_widget_array_string(wdi);
		}
	if ("namestyle" in wdi && wdi.namestyle == "frame") {
		var str = "<fieldset id='tk3_widget_"+wdi.name+"_wrapper' style='display:inline-block; border:2px solid'>"
		str += "<legend>" + wdi.displayname + "</legend>";
		str += rval;
		str += "</fieldset>";
		rval = str;
		}
	else if ("namestyle" in wdi && wdi.namestyle == "front") {
		rval = "<span style='display:inline-block' id='tk3_widget_"+wdi.name+"_wrapper'>"+ wdi.displayname + ": <span style='display:inline-block;vertical-align:top'>" + rval + "</span></span>";
		}
	return(rval);
	}

function tk3_super_smart_number_input_for_arrays(name,event,data) {
	//Note: keep this synched with tk3_widget_oninput for slider_1f
	if (event.target.type == "number" && event.type == "input" && "inputType" in event) { //should be text area modification, but not enter
		}
	else if (event.target.type == "number" && event.type == "input") { //should be spin buttons
		tk3_global_widget_registry[name].value[data] = Number(event.target.value);
		tk3_widget_set_value(name);
		tk3_global_widget_registry[name].ignorenextchange = true;
		}
	else if (event.target.type == "number" && event.type == "change") { //enter or spin buttons
		if (tk3_global_widget_registry[name].ignorenextchange) {
			tk3_global_widget_registry[name].ignorenextchange = false; //spin buttons
			}
		else {
			tk3_global_widget_registry[name].value[data] = Number(event.target.value);
			tk3_widget_set_value(name,undefined,1); //enter
			}
		}
	else {
		tk3_global_widget_registry[name].value[data] = Number(event.target.value);
		tk3_widget_set_value(name); //slider
		}
	}

function tk3_parse_number_list(str) {
	var i;
	var l = str.split(/,|\s/g);
	var rval = [];
	for (i = 0; i < l.length; i++) {
		var k = Number.parseFloat(l[i]);
		if (!isNaN(k)) {rval.push(k);}
		}
	return(rval);
	}

function tk3_widget_oninput(name,event,data) {
	var oninputlater = false; //with e.g. file reading, need to wait until the file is ready to call wdi.oninput
	var wdi = tk3_global_widget_registry[name];
	var type = wdi.type;
	if (type == "slider_1f") {
		if (event.target.type == "number" && event.type == "input" && "inputType" in event) { //should be text area modification, but not enter
			}
		else if (event.target.type == "number" && event.type == "input") { //should be spin buttons
			tk3_widget_set_value(name,Number(event.target.value));
			tk3_global_widget_registry[name].ignorenextchange = true;
			}
		else if (event.target.type == "number" && event.type == "change") { //enter or spin buttons
			if (tk3_global_widget_registry[name].ignorenextchange) {
				tk3_global_widget_registry[name].ignorenextchange = false; //spin buttons
				}
			else {
				tk3_widget_set_value(name,Number(event.target.value),1); //enter
				}
			}
		else {
			tk3_widget_set_value(name,Number(event.target.value)); //slider
			}
		}
	if (["slider_2f","slider_3f","slider_4f"].indexOf(type) != -1) {
		tk3_super_smart_number_input_for_arrays(name,event,data);
		}
	if (type == "color") {
		if (data == -1) { //the <input type='color'>
			var l = tk3_parse_color_string_to_rgb(event.target.value);
			l.push(wdi.value[3]);
			tk3_widget_set_value(name, l);
			}
		else {
			tk3_super_smart_number_input_for_arrays(name,event,data)
			}
		}
	if (type == "square") {
		if (data == -1) { //mousedown
			event.target.setPointerCapture(event.pointerId);
			event.preventDefault();
			}
		if ((data == -1) || (data == -2) && (event.buttons == 1)) {
			event.target.setPointerCapture(event.pointerId);
			var r = event.target.getBoundingClientRect();
			var x = (event.clientX - r.left - wdi.radius -1)/wdi.size;
			var y = (1-(event.clientY - r.top - wdi.radius -1)/wdi.size);
			x = Number(Math.min(Math.max(x,0),1).toFixed(2));
			y = Number(Math.min(Math.max(y,0),1).toFixed(2));
			tk3_widget_set_value(name,[x,y]);
			event.preventDefault();
			}
		else if (data == 0 | data == 1) {
			tk3_super_smart_number_input_for_arrays(name,event,data)
			}
		}
	if (type == "array") {
		var str = event.target.value;
		tk3_widget_set_value(name, str, 1);
		}
	if ("oninput" in wdi && !oninputlater) {
		wdi.oninput(event, wdi);
		}
	}

function tk3_widget_set_value(name,value,data) {
	var type = tk3_global_widget_registry[name].type;
	var wdi = tk3_global_widget_registry[name];

	var calledblank = false;

	if (value === undefined) {
		calledblank = true;
		value = tk3_global_widget_registry[name].value;
		}
	else {
		tk3_global_widget_registry[name].value = value;
		}

	if (type == "slider_1f") {
		document.getElementById("tk3_widget_"+name+"_slider0").value = value;
		if (data != 1) {
			document.getElementById("tk3_widget_"+name+"_number0").value = value;
			}
		}
	if (["slider_2f","slider_3f","slider_4f"].indexOf(type) != -1) {
		var i;
		for (i = 0; i < Number(type[7]); i++) {
			document.getElementById("tk3_widget_"+name+"_slider"+i).value = value[i];
			if (data != 1) {
				document.getElementById("tk3_widget_"+name+"_number"+i).value = value[i];
				}
			}
		}
	if (type == "color") {
		document.getElementById("tk3_widget_"+name+"_color").value = tk3_parse_rgb_to_color_string(value);
		for (var i = 0; i < 4; i++) {
			document.getElementById("tk3_widget_"+name+"_number"+i).value = value[i];
			}
		}
	if (type == "square") {
		document.getElementById("tk3_widget_"+name+"_number0").value = value[0];
		document.getElementById("tk3_widget_"+name+"_number1").value = value[1];
		tk3_widget_square_draw(name);
		}
	if (type == "array") {
		if (typeof value == "string") {
			tk3_global_widget_registry[name].value = tk3_parse_number_list(value);
			tk3_global_widget_registry[name].string = value;
			}
		else {
			tk3_global_widget_registry[name].string = tk3_list_to_string(value);
			}
		if (data != 1) {
			document.getElementById("tk3_widget_"+name+"_textarea").value = tk3_global_widget_registry[name].string;
			}
		}
	if ("onset" in tk3_global_widget_registry[name]) {
		tk3_global_widget_registry[name].onset(wdi);
		}
	}

function tk3_widget_value(n) {
	if (!(n in tk3_global_widget_registry)) {return;}
	var wdi = tk3_global_widget_registry[n];
	return(tk3_global_widget_registry[n].value);
	}

function tk3_widget_remove(n) {
	if (!(n in tk3_global_widget_registry)) {return;}
	delete tk3_global_widget_registry[n];
	}

function tk3_widget_push(gl,loc,n) {
	if (loc === undefined) {return;}
	if (!(n in tk3_global_widget_registry)) {return;}
	var wdi = tk3_global_widget_registry[n];
	var val = tk3_widget_value(n);
	if (wdi.type == "slider_1f") {gl.uniform1f(loc,val);}
	else if (wdi.type == "slider_2f") {gl.uniform2fv(loc,val);}
	else if (wdi.type == "slider_3f") {gl.uniform3fv(loc,val);}
	else if (wdi.type == "slider_4f") {gl.uniform4fv(loc,val);}
	else if (wdi.type == "color") {gl.uniform4fv(loc,val);}
	else if (wdi.type == "square") {gl.uniform2fv(loc,val);}
	else if (wdi.type == "array") {
		if (wdi.elementtype == "float") {gl.uniform1fv(loc,val)}
		else if (wdi.elementtype == "vec2") {gl.uniform2fv(loc,val)}
		else if (wdi.elementtype == "vec3") {gl.uniform3fv(loc,val)}
		else if (wdi.elementtype == "vec4") {gl.uniform4fv(loc,val)}
		}
	}

////////////////////END WIDGET CODE/////////////////////////