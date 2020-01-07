/*Graphing library:


The curve contains:
fct //A string, representing javascript code that can be executed as the function to be graphed
hints //An array of hints

plotdata //Structure containing data for how the graph should look
	xmin
	xmax
	ymin
	ymax
	oxmin //original
	oxmax
	oymin
	oymax
	width
	height
	on_redraw
	numpts
	showaxes
	showgrid
	dragging
	labelaxes //numbers on both axes
	trigxaxis
	ctarg //target div for controls
	labelpoints
	no_y

grapher_obj.type //string one of the following:
	//"none" - does nothing, not sure why you'd need this
	//"plot" - y = f(x)
	//"par" - [x,y] = f(t)
	//"rect"
	//"hole" 
	//"dot"
	//"sqdot"
	//"line"
	//"vf" (vector field, still working on)
	//"vec"
	//"label"
	//"vline" (vertical line)
	//"polyg" (polygon)
grapher_obj.fct //function being plotted (as a javascript function)
grapher_obj.hints //some hints for the plot.
	//A hint is: [ptx,pty,lc,rc]
		//lc=connect to the left? (NOT IMPLEMENTED)
		//rc=connect to the right? (NOT IMPLEMENTED)
	//hints must be ordered from left to right
grapher_obj.tmin //for parametric plots, may be a function of plotdata
grapher_obj.tmax //for parametric plots, may be a function of plotdata
grapher_obj.dt //for parametric plots
grapher_obj.xmin //for "plot", "rect", may be a function of plotdata 
grapher_obj.xmax //for "plot", "rect", may be a function of plotdata
grapher_obj.ymin //for "rect"
grapher_obj.ymax //for "rect"
grapher_obj.x //for "hole", "dot", "line", "label", "vline"
grapher_obj.y //for "hole", "dot", "line", "label"
grapher_obj.x2 //for "line"
grapher_obj.y2 //for "line"
grapher_obj.color //for "plot", "par", "rect", "hole", "dot", "line", "label", "polyg"
grapher_obj.linewidth //for "plot", "line", "vline", "polyg"
grapher_obj.id //for tgr_update_grapher_obj_by_id
grapher_obj.r //for "hole", "dot"
grapher_obj.incolor //for "hole"
grapher_obj.nojump //for "plot". If function moves from above view window to below view window in a single step, don't draw that line. May behave oddly with hinting
grapher_obj.label //for "label" label at x,y. If "", defaults to (x,y). Requires plotdata.labelpoints
grapher_obj.labeloffsetx //for "label"
grapher_obj.labeloffsety //for "label"
grapher_obj.textAlign //for "label"
grapher_obj.textBaseline //for "label"
grapher_obj.font //for "label"
grapher_obj.blend //not fully implemented, access to globalCompositeOperation
grapher_obj.vlist //for "polyg". A list of 2-element lists.
*/

function dbg(x) {
	document.getElementById("out").innerHTML = x;
	console.log(x);
	}

var tgr_default_grapher_obj = {
	xmin: -Infinity,
	xmax: Infinity,
	hints: [],
	color: "black",
	linewidth: 1,
	r:5,
	incolor: "white",
	}

var tgr_default_plotdata = {
	xmin: -5, xmax:5, ymin:-5, ymax:5, 
	oxmin: -5, oxmax:5, oymin:-5, oymax:5, 
	width:500, height:500,
	numpts:500,
	showaxes:true, 
	showgrid:true,
	dragging:false,
	labelaxes:true,
	labelaxesfontsize:16,
	labelpoints:true,
	no_y:false
	};

var tgr_graph_array = {};

function tgr_tograph(x,mn,mx,side) {
	if (x == Infinity) {return(side);}
	if (x == -Infinity) {return(0);}
	var m = -side/(mn-mx);
	var b = side*mn/(mn-mx);
	if (x == "fakezero") {
		var rval = m*0+b;
		if (rval < 7) {return(7);}
		if (rval > side-7) {return(side-7);}
		return(rval);
		}
	if (Array.isArray(x) && x[0] == "fakezero") {
		var rval = m*0+b;
		if (rval < x[1]) {return(x[1]);}
		if (rval > side-x[1]) {return(side-x[1]);}
		return(rval);
		}
	return(m*x+b);
	}

function tgr_fromgraph(x,mn,mx,side) {
	var m = -side/(mn-mx);
	var b = side*mn/(mn-mx);
	return((x-b)/m);
	}

function tgr_tocanv(pt,pd) {
	var rx = tgr_tograph(pt[0],pd.xmin,pd.xmax,pd.width);
	var ry = pd.height-tgr_tograph(pt[1],pd.ymin,pd.ymax,pd.height);
	return([rx,ry]);
	}

function tgr_fromcanv(pt,pd) {
	var rx = tgr_fromgraph(pt[0],pd.xmin,pd.xmax,pd.width);
	var ry = tgr_fromgraph(pd.height-pt[1],pd.ymin,pd.ymax,pd.height);
	return([rx,ry]);
	}

function tgr_delta_fromcanv(dpt,pd) {
	var mx = -pd.width/(pd.xmin-pd.xmax);
	var my = -pd.height/(pd.ymin-pd.ymax);
	return([dpt[0]/mx,dpt[1]/my]);
	}

function tgr_sci(a,n) {//TODO: add scientific notation
	if (a == 0) {
		return(0);
		}
	if (n < 0) {
		return((a*Math.pow(10,n)).toFixed(-n));
		}
	return(a*Math.pow(10,n));
	}

function tgr_gcd(a,b) {
	a = Math.abs(a);
	b = Math.abs(b);
	while (a != b) {
		if (a > b) { a -= b; }
		else {b -= a;}
		}
	return(a);
	}

function tgr_pifrac(ctx,pt,p,q) { //draws p*pi/q (mathed) on ctx at absolute coordinates pt.
	if (p == 0) {
		ctx.strokeStyle = "white";
		ctx.lineWidth = 7;
		ctx.fillStyle = "black";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "16 px sans-serif";
		ctx.strokeText("0",pt[0],pt[1]);
		ctx.fillText("0",pt[0],pt[1]);
		}
	else if (Math.abs(p) % q == 0) {
		ctx.strokeStyle = "white";
		ctx.lineWidth = 7;
		ctx.fillStyle = "black";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = "16px serif";
		var piw = ctx.measureText("\u03C0").width;
		ctx.font = "16px sans-serif";
		var txt = (p/q);
		if (txt == 1) {txt = "";}
		if (txt == -1) {txt = "-";}
		var w = ctx.measureText(txt).width + 1.2*piw;
		ctx.strokeText(txt,pt[0]-w/2,pt[1]);
		ctx.textAlign = "right";
		ctx.font = "16px serif";
		ctx.strokeText("\u03C0",pt[0]+w/2,pt[1]);
		ctx.textAlign = "left";
		ctx.font = "16px sans-serif";
		ctx.fillText(txt,pt[0]-w/2,pt[1]);
		ctx.textAlign = "right";
		ctx.font = "16px serif";
		ctx.fillText("\u03C0",pt[0]+w/2,pt[1]);
		}
	else {
		var fracn,fracd,tgcd;
		tgcd = tgr_gcd(p,q);
		fracn = p/tgcd;
		fracd = q/tgcd;
		if (fracn == 1) {fracn = "";}
		if (fracn == -1) {fracn = "-";}
		ctx.font = "12px serif";
		var piw = ctx.measureText("\u03C0").width;
		ctx.font = "12px sans-serif";
		var numeratorwidth = ctx.measureText(fracn).width + 1.2*piw;
		var denominatorwidth = ctx.measureText(fracd).width;
		var fracwidth = Math.max(numeratorwidth,denominatorwidth);
		ctx.font = "16px sans-serif";

		ctx.fillStyle = "white";
		ctx.fillRect(pt[0]-fracwidth/2,pt[1] - (12+2),fracwidth, 2*12+1); //that 12 is from 12px font
		
		ctx.fillStyle = "black";

		ctx.textBaseline = "top";
		ctx.textAlign = "center";
		ctx.font = "12px serif";
		ctx.fillText(fracd,pt[0],pt[1]+1);

		ctx.textBaseline = "bottom";
		ctx.textAlign = "left";
		ctx.fillText(fracn,pt[0]-numeratorwidth/2,pt[1]-1);

		ctx.font = "16px serif";
		ctx.textAlign = "right";
		ctx.fillText("\u03C0",pt[0]+numeratorwidth/2,pt[1]-1);
		
		ctx.lineWidth = 2;
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(pt[0]-fracwidth/2,pt[1]-1);
		ctx.lineTo(pt[0]+fracwidth/2,pt[1]-1);
		ctx.stroke();
		
		}
	}

function tgr_labeltrigxaxis(ctx,pd) {
	//function tgr_pifrac(ctx,pt,p,q) { //draws p*pi/q (mathed) on ctx at absolute coordinates pt.
	var denom;
	var i;
	var k = (pd.xmax-pd.xmin)*500/pd.width;
	if (k > 20) {
		var n = Math.floor(-.7+Math.log10(k));
		var lowb = Math.ceil(pd.xmin/(Math.pow(10,n)*Math.PI));
		var upb = Math.floor(pd.xmax/(Math.pow(10,n)*Math.PI));
		var lud = upb-lowb;
		for (i = 0; i <= lud; i++) {
			ctx.beginPath();
			ctx.strokeStyle = "gray";
			ctx.lineWidth = 2;
			ctx.moveTo(...tgr_tocanv([(i+lowb)*Math.pow(10,n)*Math.PI,Infinity],pd));
			ctx.lineTo(...tgr_tocanv([(i+lowb)*Math.pow(10,n)*Math.PI,-Infinity],pd));
			ctx.stroke();
			tgr_pifrac(ctx,tgr_tocanv([(i+lowb)*Math.pow(10,n)*Math.PI,"fakezero"],pd),(i+lowb)*Math.pow(10,n),1);
			}
		}
	else {
		if (k > 8) {denom = 2;}
		else if (k > 5) {denom = 6;}
		else {denom = 12;}
		var step = Math.PI/denom;
		var lowb = Math.ceil(pd.xmin/step);
		var upb = Math.floor(pd.xmax/step);
		var lud = upb-lowb;
		for (i = 0; i <= lud; i++) {
			ctx.beginPath();
			ctx.strokeStyle = "gray";
			ctx.lineWidth = 2;
			if (Math.abs(i+lowb) % denom == 0) {ctx.strokeStyle = "black";}
			ctx.moveTo(...tgr_tocanv([(i+lowb)*step,Infinity],pd));
			ctx.lineTo(...tgr_tocanv([(i+lowb)*step,-Infinity],pd));
			ctx.stroke();
			tgr_pifrac(ctx,tgr_tocanv([(i+lowb)*step,"fakezero"],pd),(i+lowb),denom);
			}
		}
	}

function tgr_draw_graph(id) {
	try {
	var pd = tgr_graph_array[id].plotdata;
	var ctx = document.getElementById("tgr_canv_"+id).getContext("2d");
	ctx.beginPath();
	ctx.fillStyle = "white";
	ctx.fillRect(0,0,pd.width,pd.height);
	var i;
	if (pd.showgrid) {
		if (pd.trigxaxis && (pd.xmax-pd.xmin)*500/pd.width > 1) {
			}
		else {
			var decx = Math.pow(10, Math.floor(-.3+ Math.log10(pd.xmax-pd.xmin)));
			var lb = Math.ceil(pd.xmin/decx)*decx;
			for (i = 0; i <= 30 && i*decx + lb <= pd.xmax; i++) {
			//for (i = Math.ceil(pd.xmin/decx)*decx; i < pd.xmax; i += decx) {
				ctx.strokeStyle = "gray";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(...tgr_tocanv([lb+i*decx,Infinity],pd));
				ctx.lineTo(...tgr_tocanv([lb+i*decx,-Infinity],pd));
				ctx.stroke();
				}
			}
		}
	if (pd.showgrid && !pd.no_y) {
		var decy = Math.pow(10, Math.floor(-.3+Math.log10(pd.ymax-pd.ymin)));
		lb = Math.ceil(pd.ymin/decy)*decy;
		for (i = 0; i <= 30 && i*decy + lb <= pd.ymax; i++) {
		//for (i = Math.ceil(pd.ymin/decy)*decy; i < pd.ymax; i += decy) {
			ctx.strokeStyle = "gray";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(...tgr_tocanv([Infinity,lb+i*decy],pd));
			ctx.lineTo(...tgr_tocanv([-Infinity,lb+i*decy],pd));
			ctx.stroke();
			}
		}
	if (pd.showaxes) {
		ctx.strokeStyle = "black";
		ctx.lineWidth = 2;
		if (!pd.no_y) {
			ctx.beginPath();
			ctx.moveTo(...tgr_tocanv([0,Infinity],pd));
			ctx.lineTo(...tgr_tocanv([0,-Infinity],pd));
			ctx.stroke();
			}
		ctx.beginPath();
		ctx.moveTo(...tgr_tocanv([Infinity,0],pd));
		ctx.lineTo(...tgr_tocanv([-Infinity,0],pd));
		ctx.stroke();
		}
	if (pd.labelaxes) {
		ctx.strokeStyle = "white";
		ctx.lineWidth = 7;
		ctx.fillStyle = "black";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = pd.labelaxesfontsize + "px sans-serif";
		if (pd.trigxaxis && (pd.xmax-pd.xmin)*500/pd.width > 1) {
			tgr_labeltrigxaxis(ctx,pd);
			}
		else {
			var n = Math.floor(-.3+Math.log10((pd.xmax-pd.xmin)*500/pd.width));
			var lowb = Math.ceil(pd.xmin/Math.pow(10,n));
			var upb = Math.floor(pd.xmax/Math.pow(10,n));
			var lud = upb-lowb;
			for (i = 0; i <= lud; i++) {
				ctx.beginPath();
				ctx.strokeText(tgr_sci((i+lowb),n), ...tgr_tocanv([(i+lowb)*Math.pow(10,n),"fakezero"],pd));
				ctx.fillText(tgr_sci((i+lowb),n), ...tgr_tocanv([(i+lowb)*Math.pow(10,n),"fakezero"],pd));
				}
			}
		var w;
		if (!pd.no_y) {
			ctx.strokeStyle = "white";
			ctx.lineWidth = 7;
			ctx.fillStyle = "black";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = pd.labelaxesfontsize + "px sans-serif";
			var n = Math.floor(-.4+Math.log10((pd.ymax-pd.ymin)*500/pd.height));
			var lowb = Math.ceil(pd.ymin/Math.pow(10,n));
			var upb = Math.floor(pd.ymax/Math.pow(10,n));
			var lud = upb-lowb;
			for (i = 0; i <= lud; i++) {
				ctx.beginPath();
				w = ctx.measureText(tgr_sci((i+lowb),n)).width;
				ctx.strokeText(tgr_sci((i+lowb),n), ...tgr_tocanv([["fakezero",w/2],(i+lowb)*Math.pow(10,n)],pd));
				ctx.fillText(tgr_sci((i+lowb),n), ...tgr_tocanv([["fakezero",w/2],(i+lowb)*Math.pow(10,n)],pd));
				}
			}
		}
	for (i = 0; i < tgr_graph_array[id].grapher_objs.length; i++) {
		tgr_plot(tgr_graph_array[id].grapher_objs[i], ctx, pd);
		}
	if ("on_redraw" in pd) {
		pd.on_redraw();
		}
	} catch(e) {}
	}

function tgr_fun(jstr) {
	var ooo;
	//eval("f = function(x) {return("+jstr.replace(/(\(x\)|\bx\b)/gi,'(Number(x))')+");};");
	eval("ooo = function(x) {return("+jstr.replace(/(\(x\)|\bx\b)/gi,'(x)')+");};");
	return(ooo);
	}

function tgr_plug(f,pd) {
	if (typeof f == "function") {
		return(f(pd));
		}
	else {return(f);}
	}

function tgr_detect_jump(pt1,pt2,pd) {
	if ((pt1[1] > pd.height) && (pt2[1] < 0)) {return(true);}
	if ((pt1[1] < 0) && (pt2[1] > pd.height)) {return(true);}
	return(false);
	}

function tgr_plot(grapher_obj, ctx, pd) {
	var i,j;
	if ("blend" in grapher_obj) {
		ctx.globalCompositeOperation = grapher_obj.blend;
		}
	if (grapher_obj.type == "plot") {
		var xmax, xmin;
		var minhintindex = 0;
		var hints = tgr_plug(grapher_obj.hints,pd);
		if (grapher_obj.xmax !== undefined) {
			xmax = Math.min(pd.xmax,tgr_plug(grapher_obj.xmax,pd));
			}
		else {xmax = pd.xmax;}
		if (grapher_obj.xmin !== undefined) {
			xmin = Math.max(pd.xmin,tgr_plug(grapher_obj.xmin,pd));
			}
		else {xmin = pd.xmin;}
		var f = grapher_obj.fct;
		var dx = (xmax-xmin)/pd.numpts;
		ctx.beginPath();
		ctx.strokeStyle = grapher_obj.color;
		ctx.lineWidth = grapher_obj.linewidth;
		var x = 0;
		for (i = 0; i < pd.numpts; i++) {
			var x1 = xmin + i*(xmax-xmin)/pd.numpts;
			var x2 = xmin + (i+1)*(xmax-xmin)/pd.numpts;
			ctx.beginPath();
			ctx.moveTo(...tgr_tocanv([x1,f(x1)],pd));
			while (minhintindex < hints.length && hints[minhintindex][0] < x2) {
				ctx.lineTo(...tgr_tocanv([hints[minhintindex][0],hints[minhintindex][1]],pd));
				minhintindex++;
				}
			if (grapher_obj.nojump && tgr_detect_jump(tgr_tocanv([x1,f(x1)],pd),tgr_tocanv([x2,f(x2)],pd),pd)) {
				ctx.stroke();
				ctx.beginPath();
				}
			ctx.lineTo(...tgr_tocanv([x2,f(x2)],pd));
			ctx.stroke();
			}
		}
	if (grapher_obj.type == "par") {
		var f = grapher_obj.fct;
		var dt = grapher_obj.dt;
		var tmin = tgr_plug(grapher_obj.tmin,pd);
		var tmax = tgr_plug(grapher_obj.tmax,pd);
		ctx.beginPath();
		ctx.lineWidth = 1;
		ctx.strokeStyle = grapher_obj.color;
		for (i = tmin; i <= tmax; i+=dt) {
			ctx.lineTo(...tgr_tocanv(f(i),pd));
			}
		ctx.stroke();
		}
	if (grapher_obj.type == "vf") {
		var f = grapher_obj.fct;
		var dx = (pd.xmax-pd.xmin)/pd.numpts;
		var dy = (pd.ymax-pd.ymin)/pd.numpts;
		for (i = pd.xmin; i <= pd.xmax; i += dx) {
			for (j = pd.ymin; j <= pd.ymax; j += dy) {
				tgr_arrow(ctx, tgr_tocanv([i,j],pd), f([i,j]));
				}
			}
		}
	if (grapher_obj.type == "rect") {
		var xmax, xmin;
		if (grapher_obj.xmax !== undefined) {
			xmax = Math.min(pd.xmax,tgr_plug(grapher_obj.xmax,pd));
			}
		else {xmax = pd.xmax;}
		if (grapher_obj.xmin !== undefined) {
			xmin = Math.max(pd.xmin,tgr_plug(grapher_obj.xmin,pd));
			}
		else {xmin = pd.xmin;}
		var ymax, ymin;
		if (grapher_obj.ymax !== undefined) {
			ymax = Math.min(pd.ymax,tgr_plug(grapher_obj.ymax,pd));
			}
		else {ymax = pd.ymax;}
		if (grapher_obj.ymin !== undefined) {
			ymin = Math.max(pd.ymin,tgr_plug(grapher_obj.ymin,pd));
			}
		else {ymin = pd.ymin;}
		ctx.fillStyle = grapher_obj.color;
		tgr_rect(ctx, ...tgr_tocanv([xmin,ymin],pd), ...tgr_tocanv([xmax,ymax],pd));
		}
	if (grapher_obj.type == "hole") {
		var pointx,pointy;
		pointx = tgr_plug(grapher_obj.x,pd);
		pointy = tgr_plug(grapher_obj.y,pd);
		ctx.beginPath();
		ctx.arc(...tgr_tocanv([pointx,pointy],pd), grapher_obj.r+1, 0, 2*Math.PI);
		ctx.fillStyle=grapher_obj.color;
		ctx.fill();
		ctx.beginPath();
		ctx.arc(...tgr_tocanv([pointx,pointy],pd), grapher_obj.r-1, 0, 2*Math.PI);
		ctx.fillStyle=grapher_obj.incolor;
		ctx.fill();
		}
	if (grapher_obj.type == "dot") {
		var pointx,pointy;
		pointx = tgr_plug(grapher_obj.x,pd);
		pointy = tgr_plug(grapher_obj.y,pd);
		ctx.beginPath();
		ctx.arc(...tgr_tocanv([pointx,pointy],pd), grapher_obj.r, 0, 2*Math.PI);
		ctx.fillStyle=grapher_obj.color;
		ctx.fill();
		}
	if (grapher_obj.type == "sqdot") {
		var pointx,pointy;
		pointx = tgr_plug(grapher_obj.x,pd);
		pointy = tgr_plug(grapher_obj.y,pd);
		ctx.beginPath();
		var canvx, canvy;
		canvx = tgr_tocanv([pointx,pointy],pd)[0];
		canvy = tgr_tocanv([pointx,pointy],pd)[1];
		var r = grapher_obj.r;
		ctx.moveTo(canvx+r,canvy+r);
		ctx.lineTo(canvx+r,canvy-r);
		ctx.lineTo(canvx-r,canvy-r);
		ctx.lineTo(canvx-r,canvy+r);
		ctx.closePath();
		ctx.fillStyle=grapher_obj.color;
		ctx.fill();
		}
	if (grapher_obj.type == "line") {
		var lx1, lx2, ly1, ly2;
		lx1 = tgr_plug(grapher_obj.x,pd);
		ly1 = tgr_plug(grapher_obj.y,pd);
		lx2 = tgr_plug(grapher_obj.x2,pd);
		ly2 = tgr_plug(grapher_obj.y2,pd);
		ctx.beginPath();
		ctx.strokeStyle = grapher_obj.color;
		ctx.lineWidth = grapher_obj.linewidth;
		ctx.moveTo(...tgr_tocanv([lx1,ly1],pd));
		ctx.lineTo(...tgr_tocanv([lx2,ly2],pd));
		ctx.stroke();
		}
	if (grapher_obj.type == "vec") {
		var lx1, lx2, ly1, ly2, lg;
		lx1 = tgr_plug(grapher_obj.x,pd);
		ly1 = tgr_plug(grapher_obj.y,pd);
		lx2 = tgr_plug(grapher_obj.x2,pd);
		ly2 = tgr_plug(grapher_obj.y2,pd);
		var p1 = tgr_tocanv([lx1,ly1],pd);
		var p2 = tgr_tocanv([lx2,ly2],pd);
		lg = Math.sqrt((p1[0]-p2[0])*(p1[0]-p2[0])+(p1[1]-p2[1])*(p1[1]-p2[1]));
		var xx = 7*(p1[0]-p2[0])/lg;
		var yy = 7*(p1[1]-p2[1])/lg;
		ctx.beginPath();
		ctx.strokeStyle = grapher_obj.color;
		ctx.lineWidth = 2;
		ctx.moveTo(...p1);
		ctx.lineTo(...p2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(p2[0]+2*xx+yy,p2[1]+2*yy-xx);
		ctx.lineTo(...p2);
		ctx.lineTo(p2[0]+2*xx-yy,p2[1]+2*yy+xx);
		ctx.stroke();
		}
	if (grapher_obj.type == "label" && pd.labelpoints) {
		var pointx,pointy;
		pointx = tgr_plug(grapher_obj.x,pd);
		pointy = tgr_plug(grapher_obj.y,pd);
		var str;
		if (!("label" in grapher_obj) || (grapher_obj.label == "")) {
			str = "("+Number(grapher_obj.x.toFixed(2))+","+Number(grapher_obj.y.toFixed(2))+")";
			}
		else {
			str = grapher_obj.label;
			}
		if ("font" in grapher_obj) {
			ctx.font = grapher_obj.font;
			}
		ctx.beginPath();
		ctx.fillStyle = grapher_obj.color;
		if ("textAlign" in grapher_obj) {
			ctx.textAlign = grapher_obj.textAlign;
			}
		else {
			ctx.textAlign = "center";
			}
		if ("textBaseline" in grapher_obj) {
			ctx.textBaseline = grapher_obj.textBaseline;
			}
		else {
			ctx.textBaseline = "middle";
			}
		var p = tgr_tocanv([pointx,pointy],pd);
		var offx = 0;
		var offy = 0;
		if ("labeloffsetx" in grapher_obj) {
			offx = grapher_obj.labeloffsetx;
			}
		if ("labeloffsety" in grapher_obj) {
			offy = grapher_obj.labeloffsety;
			}
		ctx.fillText(str, p[0]+offx, p[1]+offy);
		}
	if (grapher_obj.type == "vline") {
		var linex = tgr_plug(grapher_obj.x,pd);
		ctx.beginPath();
		ctx.strokeStyle = grapher_obj.color;
		ctx.lineWidth = grapher_obj.linewidth;
		ctx.moveTo(...tgr_tocanv([linex,-Infinity],pd));
		ctx.lineTo(...tgr_tocanv([linex,Infinity],pd));
		ctx.stroke();
		}
	if (grapher_obj.type == "polyg") {
		ctx.beginPath();
		ctx.strokeStyle = "black";
		if (grapher_obj.color != "none") {ctx.fillStyle = grapher_obj.color;}
		ctx.lineWidth = grapher_obj.linewidth;
		
		for (i = 0; i < grapher_obj.vlist.length; i++) {
			if (i == 0) {ctx.moveTo(...tgr_tocanv(grapher_obj.vlist[i],pd));}
			else {ctx.lineTo(...tgr_tocanv(grapher_obj.vlist[i],pd));}
			}
		ctx.closePath();
		if (grapher_obj.color != "none") {ctx.fill();}
		ctx.stroke();
		}
	if ("blend" in grapher_obj) {
		ctx.globalCompositeOperation = "source-over";
		}
	}

function tgr_rect(ctx, x1,y1,x2,y2) {
	ctx.fillRect(x1,y1,x2-x1,y2-y1);
	}

function tgr_arrow(ctx, pt, dir) { //will take more options (formatting)
	ctx.beginPath();
	ctx.linewidth=2;
	ctx.strokeStyle = "black";
	dir[1] = -dir[1];
	var lg = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
	var ax = 5*(dir[0])/lg;
	var ay = 5*(dir[1])/lg;
	ctx.moveTo(pt[0],pt[1]);
	ctx.lineTo(pt[0]+dir[0],pt[1]+dir[1]);
	ctx.stroke();
	ctx.beginPath();
	ctx.fillStyle = "black";
	ctx.moveTo(pt[0]+dir[0],pt[1]+dir[1]);
	ctx.lineTo(pt[0]+dir[0]+2*ax+ay,pt[1]+dir[1]+2*ay-ax);
	ctx.lineTo(pt[0]+dir[0]+2*ax-ay,pt[1]+dir[1]+2*ay+ax);
	ctx.lineTo(pt[0]+dir[0],pt[1]+dir[1]);
	ctx.fill();
	}

function tgr_grapher(id, grapher_objs, plotdata) {
	plotdata = plotdata || {};
	plotdata = Object.assign({},tgr_default_plotdata,plotdata);
	var targ = id;
	if ("ctarg" in plotdata) {
		targ = plotdata.ctarg;
		}
	var ts = tgr_string(id, grapher_objs, plotdata);
	document.getElementById(id).innerHTML = ts[0];
	document.getElementById(targ).innerHTML += ts[1];
	tgr_graph_array[id] = {grapher_objs:{}, plotdata:{}};
	var i;
	tgr_graph_array[id].grapher_objs = [];
	for (i = 0; i < grapher_objs.length; i++) {
		tgr_graph_array[id].grapher_objs[i] = Object.assign({},tgr_default_grapher_obj,grapher_objs[i]);
		}
	tgr_graph_array[id].plotdata = Object.assign({},plotdata);
	tgr_draw_graph(id);
	}

function tgr_grapher_string(id, grapher_objs, plotdata) { //doesn't support ctarg, obviously.
	var blanksvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='100%25' height='100%25' fill='white' /%3E%3C/svg%3E";
	plotdata = plotdata || {};
	plotdata = Object.assign({},tgr_default_plotdata,plotdata);
	var ts = tgr_string(id, grapher_objs, plotdata);
	tgr_graph_array[id] = {grapher_objs:{}, plotdata:{}};
	var i;
	tgr_graph_array[id].grapher_objs = [];
	for (i = 0; i < grapher_objs.length; i++) {
		tgr_graph_array[id].grapher_objs[i] = Object.assign({},tgr_default_grapher_obj,grapher_objs[i]);
		}
	tgr_graph_array[id].plotdata = Object.assign({},plotdata);
	var str = "<span id='"+id+"'>"+ts[0] + ts[1]+"</span>";
	//setTimeout(function(){tgr_draw_graph(id);},10);
	str += "<img src=\""+blanksvg+"\" onload='tgr_draw_graph(\""+id+"\")'>";
	return(str);
	}

function tgr_update_grapher_objs(id,grapher_objs) {
	tgr_graph_array[id].grapher_objs = [];
	for (i = 0; i < grapher_objs.length; i++) {
		tgr_graph_array[id].grapher_objs[i] = Object.assign({},tgr_default_grapher_obj,grapher_objs[i]);
		}
	tgr_draw_graph(id);
	}

function tgr_add_to_grapher_objs(id,grapher_obj) {
	tgr_graph_array[id].grapher_objs.push(Object.assign({},tgr_default_grapher_obj,grapher_obj));
	tgr_draw_graph(id);
	}

function tgr_update_grapher_obj_by_id(id,goid,grapher_obj) {//note: if no grapher_obj of id has id=goid, creates a new grapher_obj by that name, if several have goid, replaces the first
	var i;
	for (i = 0; i < tgr_graph_array[id].grapher_objs.length; i++) {
		if (tgr_graph_array[id].grapher_objs[i].id == goid) {
			tgr_graph_array[id].grapher_objs[i] = Object.assign({},tgr_default_grapher_obj,grapher_obj,{id:goid});
			tgr_draw_graph(id);
			return;
			}
		}
	//didn't find a grapher_obj with id=goid
	tgr_graph_array[id].grapher_objs.push(Object.assign({},tgr_default_grapher_obj,grapher_obj,{id:goid}));
	tgr_draw_graph(id);
	}

function tgr_update_plotdata(id,pd) { //pd may be partial
	var i;
	for (i in pd) {
		tgr_graph_array[id].plotdata[i] = pd[i];
		}
	tgr_update_bound_boxes(id);
	tgr_draw_graph(id);
	}

function tgr_update_bound_boxes(id) {
	document.getElementById("tgr_plotminx_"+id).value = tgr_graph_array[id].plotdata.xmin;
	document.getElementById("tgr_plotmaxx_"+id).value = tgr_graph_array[id].plotdata.xmax;
	document.getElementById("tgr_plotminy_"+id).value = tgr_graph_array[id].plotdata.ymin;
	document.getElementById("tgr_plotmaxy_"+id).value = tgr_graph_array[id].plotdata.ymax;
	}

function tgr_evt(id,e) {
	tgr_graph_array[id].plotdata.xmin = document.getElementById("tgr_plotminx_"+id).value;
	tgr_graph_array[id].plotdata.xmax = document.getElementById("tgr_plotmaxx_"+id).value;
	if (!tgr_graph_array[id].plotdata.no_y) {
		tgr_graph_array[id].plotdata.ymin = document.getElementById("tgr_plotminy_"+id).value;
		tgr_graph_array[id].plotdata.ymax = document.getElementById("tgr_plotmaxy_"+id).value;
		}
	tgr_draw_graph(id);
	}

function tgr_wheel(id,e) {
	var m = 1;
	e.preventDefault();
	if (e.deltaY > 0) {m=1.25;}
	if (e.deltaY < 0) {m=.8;}
	var rect=e.target.getBoundingClientRect();
	var clickx = e.clientX-rect.x; //e.offsetX;
	var clicky = e.clientY-rect.y; //e.offsetY;
	var pd = tgr_graph_array[id].plotdata;
	var inc = tgr_fromcanv([clickx,clicky],pd);
	var inx = inc[0];
	var iny = inc[1];
	pd.xmax = inx + m*(pd.xmax-inx);
	pd.xmin = inx + m*(pd.xmin-inx);
	pd.ymax = iny + m*(pd.ymax-iny);
	pd.ymin = iny + m*(pd.ymin-iny);
	if (pd.no_y) {
		pd.ymin = pd.oymin;
		pd.ymax = pd.oymax;
		}
	tgr_graph_array[id].plotdata = pd;
	tgr_update_bound_boxes(id);
	tgr_draw_graph(id);
	}

function tgr_mdown(id,e) {
	var rect=e.target.getBoundingClientRect();
	var eX = e.clientX-rect.x;
	var eY = e.clientY-rect.y;
	tgr_graph_array[id].plotdata.dragging = true;
	}

function tgr_mmove(id,e) {
	if (tgr_graph_array[id].plotdata.dragging) {
		var pd = tgr_graph_array[id].plotdata;
		var delt = tgr_delta_fromcanv([e.movementX,e.movementY],pd);
		pd.xmax -= delt[0];
		pd.xmin -= delt[0];
		if (! pd.no_y) {
			pd.ymax += delt[1];
			pd.ymin += delt[1];
			}
		tgr_update_bound_boxes(id);
		tgr_draw_graph(id);
		}
	//console.log(tgr_graph_array[id].plotdata);
	//console.log(tgr_fromcanv([eX,eY],tgr_graph_array[id].plotdata));
	}

function tgr_mup(id,e) {
	tgr_graph_array[id].plotdata.dragging = false;
	}

function tgr_zoom(st,id) {
	var pd = tgr_graph_array[id].plotdata;
	if (st == "in" || st == "inH") {
		var oxmin = pd.xmin;
		var oxmax = pd.xmax;
		pd.xmin = .75*oxmin+.25*oxmax;
		pd.xmax = .75*oxmax+.25*oxmin;
		}
	if (st == "in" || st == "inV") {
		var oymin = pd.ymin;
		var oymax = pd.ymax;
		pd.ymin = .75*oymin+.25*oymax;
		pd.ymax = .75*oymax+.25*oymin;
		}
	if (st == "out" || st == "outH") {
		var oxmin = pd.xmin;
		var oxmax = pd.xmax;
		pd.xmin = 1.5*oxmin-.5*oxmax;
		pd.xmax = 1.5*oxmax-.5*oxmin;
		}
	if (st == "out" || st == "outV") {
		var oymin = pd.ymin;
		var oymax = pd.ymax;
		pd.ymin = 1.5*oymin-.5*oymax;
		pd.ymax = 1.5*oymax-.5*oymin;
		}
	if (pd.no_y) {
		pd.ymin = pd.oymin;
		pd.ymax = pd.oymax;
		}
	tgr_update_bound_boxes(id);
	tgr_draw_graph(id);
	}

function tgr_reset(id) {
	var pd = tgr_graph_array[id].plotdata;
	pd.xmin = pd.oxmin;
	pd.xmax = pd.oxmax;
	pd.ymin = pd.oymin;
	pd.ymax = pd.oymax;
	tgr_update_bound_boxes(id);
	tgr_draw_graph(id);
	}

function tgr_zoom_string(inq,h,v) {
	var zi = "<svg width=21 height=21><circle cx=8 cy=8 r=7 stroke='black' stroke-width=2 fill='none'></circle>";
	zi += "<line x1=4 x2=12 y1=8 y2=8 stroke='black' stroke-width=2></line>";
	if (inq) {
		zi += "<line x1=8 x2=8 y1=4 y2=12 stroke='black' stroke-width=2></line>";
		}
	zi += "<line x1=13 y1=13 x2=19 y2=19 stroke='black' stroke-width=4></line>";
	if (h) {
		zi += "<line x1=4 x2=12 y1=18.5 y2=18.5 stroke='black' stroke-width=1></line>";
		zi += "<polyline points='5.5,17 4,18.5 5.5,20' stroke='black' stroke-width=.5></polyline>";
		zi += "<polyline points='10.5,17 12,18.5 10.5,20' stroke='black' stroke-width=.5></polyline>";
		}
	if (v) {
		zi += "<line y1=4 y2=12 x1=18.5 x2=18.5 stroke='black' stroke-width=1></line>";
		zi += "<polyline points='17,5.5 18.5,4 20,5.5' stroke='black' stroke-width=.5></polyline>";
		zi += "<polyline points='17,10.5 18.5,12 20,10.5' stroke='black' stroke-width=.5></polyline>";
		}
	zi += "</svg>";
	return(zi);
	}

function tgr_zoom_button(id,inq,h,v) {
	var zc;
	var tt;
	if (inq) {zc = "in"; tt="Zoom In";}
	else {zc = "out"; tt="Zoom Out";}
	if (h) {zc += "H"; tt+=" Horizontally";}
	if (v) {zc += "V"; tt+=" Vertically";}
	var rstr = "<button onclick='tgr_zoom(\"" + zc + "\",\"" + id + "\")'";
	rstr += " title=\""+tt + "\">";
	rstr += tgr_zoom_string(inq,h,v);
	rstr += "</button>";
	return(rstr);
	}

function tgr_reset_button(id) {
	var rstr = "<button onclick='tgr_reset(\""+id+"\")'";
	rstr += " title='Reset Plot Region'>";
	rstr += "<svg width=21 height=21>";
	rstr += "<path d='M 16.5 13.5 A 7 7 0 1 1 16.5 7.5' fill='none' stroke='black' stroke-width=2></path>";
	rstr += "<polygon points='17.5,3.5 17.5,8.5 12.5,8.5' fill='black' stroke='black' stroke-width=1></polyline>";
	rstr += "</svg></button>";
	return(rstr);
	}

function tgr_string(id, grapher_objs, plotdata) {
	var cstr = "";
	var gstr = "";
	cstr = "<canvas id='tgr_canv_"+id+"' width="+plotdata.width+" height="+plotdata.height+" style='border:1px solid'";
	cstr += " onwheel='tgr_wheel("+'"'+id+'"'+",event)' onmousedown='tgr_mdown("+'"'+id+'"'+",event)' onmousemove='tgr_mmove("+'"'+id+'"'+",event)' onmouseup='tgr_mup("+'"'+id+'"'+",event)' onmouseleave='tgr_mup("+'"'+id+'"'+",event)'></canvas>";
	gstr += "<table> <tr> <td>";
	gstr += "Min x: <input type='number' id='tgr_plotminx_"+id+"' oninput='tgr_evt("+'"'+id+'"'+",event)' value="+plotdata.xmin+" style='width:4em'>";
	gstr += "</td><td>"
	gstr += "Max x: <input type='number' id='tgr_plotmaxx_"+id+"' oninput='tgr_evt("+'"'+id+'"'+",event)' value="+plotdata.xmax+" style='width:4em'>";
	gstr += "</td></tr><tr";
	if (plotdata.no_y) {gstr += " style='display:none'";}
	gstr += "><td>";
	gstr += "Min y: <input type='number' id='tgr_plotminy_"+id+"' oninput='tgr_evt("+'"'+id+'"'+",event)' value="+plotdata.ymin+" style='width:4em'>";
	gstr += "</td><td>"
	gstr += "Max y: <input type='number' id='tgr_plotmaxy_"+id+"' oninput='tgr_evt("+'"'+id+'"'+",event)' value="+plotdata.ymax+" style='width:4em'>";
	gstr += "</td></tr></table>";
	gstr += tgr_zoom_button(id,1,0,0);
	if (!plotdata.no_y) {
		gstr += tgr_zoom_button(id,1,1,0);
		gstr += tgr_zoom_button(id,1,0,1);
	}
	gstr += tgr_zoom_button(id,0,0,0);
	if (!plotdata.no_y) {
		gstr += tgr_zoom_button(id,0,1,0);
		gstr += tgr_zoom_button(id,0,0,1);
	}
	gstr += tgr_reset_button(id);
	return([cstr,gstr]);
	}