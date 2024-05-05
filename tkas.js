function tkas_ptree_equiv(T1,T2) {
	if (T1.op != T2.op) {return(false);}
	if (("c" in T1) != ("c" in T2)) {return(false);}
	if (("c" in T1) && (T1.c != T2.c)) {return(false);}
	if (("subs" in T1) != ("subs" in T2)) {console.log("tkas_ptree_equiv:should never happen happened"); return(false);} //should never happen
	if ("subs" in T1) {
		if (T1.subs.length != T2.subs.length) {return(false);}
		var i;
		for (i = 0; i < T1.subs.length; i++) {
			if (! tkas_ptree_equiv(T1.subs[i],T2.subs[i])) {return(false);}
			}
		}
	return(true);
	}

function tkas_ptree_copy(T) {
	var rval = {};
	var i;
	for (i in T) {rval[i] = T[i]}
	if ("subs" in T) {
		rval.subs = [];
		for (i = 0; i < T.subs.length; i++) {
			rval.subs.push(tkas_ptree_copy(T.subs[i]));
			}
		}
	return(rval);
	}

function tkas_ptree_deep_sub(T, L) {
	if (L.length == 0) {return(T)};
	return(tkas_ptree_deep_sub(T.subs[L[0]],L.slice(1)));
	}

/*function tkas_ptree_deep_replace(T1, L, T2) {
	if (L.length == 0) {return(tkas_ptree_copy(T2))}
	var rval = {};
	var i;
	for (i in T1) {rval[i] = T1[i]}
	if ("subs" in T1) {
		rval.subs = [];
		for (i = 0; i < T1.subs.length; i++) {
			if (i == L[0]) {
				rval.subs.push(tkas_ptree_copy(T2));
				}
			else {
				rval.subs.push(tkas_ptree_copy(T1.subs[i]));
				}
			}
		}
	return(rval);
	}*/

function tkas_ptree_deep_replace(T1, L, T2) {
	if (L.length == 0) {return(tkas_ptree_copy(T2))}
	var rval = {};
	var i;
	for (i in T1) {rval[i] = T1[i]}
	if ("subs" in T1) {
		rval.subs = [];
		for (i = 0; i < T1.subs.length; i++) {
			if (i == L[0]) {
				rval.subs.push(tkas_ptree_deep_replace(T1.subs[i],L.slice(1),T2));
				//rval.subs.push(tkas_ptree_copy(T2));
				}
			else {
				rval.subs.push(tkas_ptree_copy(T1.subs[i]));
				}
			}
		}
	return(rval);
	}

function tkas_ptree_from_kas(k) {
	var subs = [];
	if (k.name() == "Add") {
		var i;
		for (i = 0; i < k.terms.length; i++) {
			subs.push(tkas_ptree_from_kas(k.terms[i]));
			}
		return({op:"ADD",subs:subs});
		}
	if (k.name() == "Mul") {
		var i;

		var numerators = [];
		var denominators = [];

		for (i = 0; i < k.terms.length; i++) {
			if ("isDivide" in k.terms[i] && k.terms[i].isDivide()) {
				denominators.push(k.terms[i].asDivide());
				}
			else {
				numerators.push(k.terms[i]);
				}
			}
		var recurseN;

		if (numerators.length == 0) {
			recurseN = {op:"INT",c:1};
			}
		else if (numerators.length == 1) {
			recurseN = tkas_ptree_from_kas(numerators[0]);
			}
		else if (denominators.length > 0) {
			recurseN = tkas_ptree_from_kas({name:function(){return("Mul");}, terms:numerators});
			}

		if (denominators.length == 1) {
			recurseD = tkas_ptree_from_kas(denominators[0]);
			return({op:"DIV",subs:[recurseN,recurseD]});
			}
		else if (denominators.length > 1) {
			recurseD = tkas_ptree_from_kas({name:function(){return("Mul");}, terms:denominators});
			return({op:"DIV",subs:[recurseN,recurseD]});
			}
		
		/*if (k.terms.length == 2 && k.terms[1].isDivide()) {
			var n = tkas_ptree_from_kas(k.terms[0]);
			var d = tkas_ptree_from_kas(k.terms[1].asDivide());
			return({op:"DIV",subs:[n,d]});
			}*/
		if (k.terms[0].name() == "Int" && k.terms[0].n == -1) {
			var recurseval = {name: function() {return("Mul");}, terms:k.terms.slice(1)}
			if (k.terms.length == 2) {
				recurseval = k.terms[1];
				}
			return({op:"NEG",subs:[tkas_ptree_from_kas(recurseval)]});
			}
		else if (k.terms[0].name() == "Int" && k.terms[0].n < 0) {
			var faketerm = {name: function() {return("Int");}, n:-k.terms[0].n};
			var recurseval = {name: function() {return("Mul");}, terms:[faketerm]}
			for (i = 1; i < k.terms.length; i++) {
				recurseval.terms.push(k.terms[i]);
				}
			return({op:"NEG",subs:[tkas_ptree_from_kas(recurseval)]});
			}
		for (i = 0; i < k.terms.length; i++) {
			subs.push(tkas_ptree_from_kas(k.terms[i]));
			}
		return({op:"MUL",subs:subs});
		}
	if (k.name() == "Pow") {
		var base = tkas_ptree_from_kas(k.base);
		if (k.isRoot()) {
			return({op:"ROOT",subs:[tkas_ptree_from_kas(k.exp.getDenominator()),base]});
			}
		return ({op:"POW", subs:[tkas_ptree_from_kas(k.base),tkas_ptree_from_kas(k.exp)]});
		}
	if (k.name() == "Log") {
		return({op:"LOGN", subs:[tkas_ptree_from_kas(k.base),tkas_ptree_from_kas(k.power)]});
		}
	if (k.name() == "Trig") {
		return({op:"APP", subs:[{op:"FUN",c:k.type},tkas_ptree_from_kas(k.arg)]});
		}
	if (k.name() == "Abs") {
		return({op:"ABS", subs:[tkas_ptree_from_kas(k.arg)]});
		}
	if (k.name() == "Eq") {
		return({op:"REL", c:k.type, subs:[tkas_ptree_from_kas(k.left), tkas_ptree_from_kas(k.right)]});
		}
	if (k.name() == "Func") {
		return({op:"APP", subs:[{op:"FUN",c:k.symbol},tkas_ptree_from_kas(k.arg)]});
		}
	if (k.name() == "Var") {
		return({op:"VAR", c:k.symbol});
		}
	if (k.name() == "Const") {
		return({op:"NUM", c:k.symbol});
		}
	if (k.name() == "Rational") {
		return({op:"DIV", subs:[{op:"NUM", c: k.n},{op:"NUM",c:k.d}]});
		}
	if (k.name() == "Int") {
		if (k.n < 0) {return({op:"NEG",subs:[{op:"NUM",c:-k.n}]});}
		return({op:"NUM", c:k.n});
		}
	if (k.name() == "Float") {
		if (k.n < 0) {return({op:"NEG",subs:[{op:"NUM",c:-k.n}]});}
		return({op:"NUM", c:k.n});
		}
	console.log("tkas_ptree_from_kas failed");
	return({op:"error"});
	}

tk_division_backdoor = true;

function tkas_kas_parse(str,opts) {
	if (KAS) {
		return(tkas_ptree_from_kas(KAS.parse(str,opts).expr));
		}
	console.log("KAS not found");
	}

var tkas_ptree_op_precedence = {
	"NUM": 12,
	"VAR": 12,
	"FUN": 12,
	"APP": 11,
	"ROOT": 11,
	"LOGN": 11,
	"ABS": 11,
	"COMP": 10,
	"POW": 9,
	"MUL": 8,
	"DIV": 8,
	"NEG": 7,
	"ADD": 6,
	"DER": 5,
	"REL": 4,
	"NOT": 3,
	"AND": 2,
	"OR": 1,
	}

var tkas_ptree_op_associativity = { //0 = N/A, 1 = left to right, -1 = right to left
	"COMP": 0,
	"NUM": 0,
	"VAR": 0,
	"FUN": 0,
	"APP": 1,
	"ROOT": 1,
	"LOGN": 1,
	"ABS": 1,
	"POW": -1,
	"MUL": 0, //changed from 1 to make (ab)(cd) display correctly
	"DIV": 1,
	"NEG": 0,
	"ADD": 0,
	"DER": -1,
	"REL": 1,
	"NOT": 0,
	"AND": 1,
	"OR": 1,
	}

function tkas_render_parenify(S,D,id) {
	if (D.rendertype == "string") {
		return("(" + S + ")");
		}
	else if (D.rendertype == "tex") {
		return("\\left(" + S + "\\right)");
		}
	else if (D.rendertype == "html" && id) {
		if (D.parentype == "string") {
			return("<span id='"+id+"'>(" + S + ")</span>");
			}
		else if (D.parentype == "css") {
			return("<span class='tkas_css_parens' id='" + id + "'><span style='margin:4px'>" + S + "</span></span>");
			}
		else if (D.parentype == "svg") {
			return("<span class='tkas_svg_parens' id='" + id + "'>" + S + "</span>");
			}
		}
	else if (D.rendertype == "html") {
		if (D.parentype == "string") {
			return("(" + S + ")");
			}
		else if (D.parentype == "css") {
			return("<span class='tkas_css_parens'><span style='margin:4px'>" + S + "</span></span>");
			}
		else if (D.parentype == "svg") {
			return("<span class='tkas_svg_parens'>" + S + "</span>");
			}
		}
	}

function tkas_render_html_abs(S,D) {
	return("<span class='tkas_absolute_value'>" + S + "</span>");
	}

function tkas_render_label(S,id,D) {
	if (D.rendertype == "string") {return(S);}
	return("<span id='"+id+"'>" + S + "</span>");
	}


function tkas_render_wrapper(T,L,D,S) {
	return(S);
	}

function tkas_render(T,D) {
	D = Object.assign({},tkas_default_pgdecor,D);
	var rval = tkas_render_recurser(T,[],D);
	if (D.rendertype =="string") {return(rval);}
	rval = "<span id='"+tkas_id_from_tag_and_lix("F"+D.id,[])+"'>"+rval+"</span>";
	return(rval);
	}

function tkas_render_recurser(T, L, D) {
	var rval;
	if (T.op == "ADD") {rval = tkas_render_ADD(T,L,D);}
	if (T.op == "MUL") {rval = tkas_render_MUL(T,L,D);}
	if (T.op == "NUM") {rval = tkas_render_NUM(T,L,D);}
	if (T.op == "NEG") {rval = tkas_render_NEG(T,L,D);}
	if (T.op == "VAR") {rval = tkas_render_VAR(T,L,D);}
	if (T.op == "DIV") {rval = tkas_render_DIV(T,L,D);}
	if (T.op == "POW") {rval = tkas_render_POW(T,L,D);}
	if (T.op == "ROOT") {rval = tkas_render_ROOT(T,L,D);}
	if (T.op == "FUN") {rval = tkas_render_FUN(T,L,D);}
	if (T.op == "APP") {rval = tkas_render_APP(T,L,D);}
	if (T.op == "LOGN") {rval = tkas_render_LOGN(T,L,D);}
	if (T.op == "ABS") {rval = tkas_render_ABS(T,L,D);}
	if (T.op == "REL") {rval = tkas_render_REL(T,L,D);}
	if (T.op == "DER") {rval = tkas_render_DER(T,L,D);}
	if (T.op == "AND") {rval = tkas_render_AND(T,L,D);}
	if (T.op == "OR") {rval = tkas_render_OR(T,L,D);}
	if (T.op == "NOT") {rval = tkas_render_NOT(T,L,D);}
	if (T.op == "COMP") {rval = tkas_render_COMP(T,L,D);}
	return(tkas_render_wrapper(T,L,D,rval));
	}

function tkas_render_check_force_plus(T,L,D,i) {
	var sub = T.subs[i];
	if (sub.op == "NEG" && "decor" in sub && "optype" in sub.decor && sub.decor.optype == "force +") {return(true);}
	return(false);
	}

function tkas_render_check_needs_mul(T,L,D,i) {
	var sub = T.subs[i];
	if (tkas_sub_needs_paren(T,D,i)) {return(false);}
	if (sub.op == "ABS") {return(false);}
	if (sub.op == "ROOT") {return(false);}
	if (sub.op == "VAR") {return(false);}
	if (sub.op == "NUM" && typeof sub.c == "string") {return(false);}
	if (sub.op == "POW") {
		return(tkas_render_check_needs_mul(sub,L,D,0));
		}
	return(true);
	}

function tkas_free_paren_position(T,D,i) {
	if (T.op == "DIV" && D.rendertype != "string") {return(true);}
	if (T.op == "POW" && i == 1 && D.rendertype != "string") {return(true);}
	if (T.op == "ROOT") {return(true);}
	if (T.op == "LOGN" && i == 0 && D.rendertype != "string") {return(true);}
	if (T.op == "LOGN" && i == 1) {return(true);}
	if (T.op == "ABS") {return(true);}
	if (T.op == "APP" && i > 0) {return(true);}
	return(false);
	}

function tkas_sub_needs_paren(T,D,i) {
	if ("decor" in T && "parens" in T.decor && T.decor.parens) {return(true);}
	else if (tkas_free_paren_position(T,D,i)) {return(false);}
	else if (tkas_ptree_op_precedence[T.op] > tkas_ptree_op_precedence[T.subs[i].op]) {return(true);}
	else if (tkas_ptree_op_precedence[T.op] == tkas_ptree_op_precedence[T.subs[i].op]) {
		if (i == 0) {return(tkas_ptree_op_associativity[T.subs[i].op] != 1);}
		else if (i == T.subs.length-1) {return(tkas_ptree_op_associativity[T.subs[i].op] != -1);}
		else {return(true);}
		}
	return(false);
	}

function tkas_subrend(T,L,D,i) {
	var id = tkas_id_from_tag_and_lix("F" + D.id, L.concat([i]));
	var rval = tkas_render_recurser(T.subs[i],L.concat([i]),D);
	if (tkas_sub_needs_paren(T,D,i)) {rval = tkas_render_parenify(rval,D,id);}
	else {
		rval = tkas_render_label(rval,id,D);
		}
	return(rval);
	}

function tkas_render_html_fraction(N,D) {
	var rval;
	rval = "<table class='tkas_fraction'><tr><td class='tkas_numerator'>" + N;
	rval += "</td></tr><tr><td class='tkas_denominator'>" + D;
	rval += "</td></tr></table>";
	return(rval);
	}

function tkas_render_html_root(I,R) {
	var rval = "";
	if (I != "") {rval += "<span class='tkas_squareroot_index'>"+I+"</span>";}
	rval += "<span class='tkas_squareroot'>"+R+"</span>";
	return(rval);
	}

function tkas_render_ADD(T,L,D) {
	var rval = "";
	var i;
	for (i = 0; i < T.subs.length; i++) {
		if ((i > 0 && T.subs[i].op != "NEG") || tkas_render_check_force_plus(T,L,D,i)) {
			rval += "+";
			}
		rval += tkas_subrend(T,L,D,i);
		}
	return(rval);
	}

function tkas_render_MUL(T,L,D) {
	var rval = "";
	var msign = "*";
	if (D.rendertype == "tex") {msign = "\\cdot ";}
	if (D.rendertype == "html") {msign = "&#8729;";}
	var i;
	for (i = 0; i < T.subs.length; i++) {
		if (i > 0 && tkas_render_check_needs_mul(T,L,D,i)) {
			rval += msign;
			}
		rval += tkas_subrend(T,L,D,i);
		}
	return(rval);
	}

function tkas_render_NEG(T,L,D) {
	var subrend = tkas_subrend(T,L,D,0);
	return("-" + subrend);
	}

function tkas_render_NUM(T,L,D) {
	if (T.c == "pi" && D.rendertype == "string") {return("π");}
	if (T.c == "pi" && D.rendertype == "html") {return("&pi;");}
	if (T.c == "pi" && D.rendertype == "tex") {return("\\pi ");}
	return(T.c);
	}

function tkas_render_VAR(T,L,D) {
	return(T.c);
	}

function tkas_render_FUN(T,L,D) {
	return(T.c);
	}

function tkas_render_DIV(T,L,D) {
	var subrendN = tkas_subrend(T,L,D,0);
	var subrendD = tkas_subrend(T,L,D,1);
	if (D.rendertype == "string") {
		return(subrendN + "/" + subrendD);
		}
	else if (D.rendertype == "tex") {
		return("\\frac{" + subrendN + "}{" + subrendD + "}");
		}
	else if (D.rendertype == "html") {
		return(tkas_render_html_fraction(subrendN,subrendD));
		}
	}

function tkas_render_POW(T,L,D) {
	var subrendB = tkas_subrend(T,L,D,0);
	var subrendE = tkas_subrend(T,L,D,1);
	if (D.rendertype == "string") {
		return(subrendB + "^" + subrendE);
		}
	else if (D.rendertype == "tex") {
		return("{"+subrendB+"}^{"+subrendE+"}");
		}
	else if (D.rendertype == "html") {
		return(subrendB+"<span class='tkas_superscript'>"+subrendE+"</span>");
		}
	}

function tkas_render_ROOT(T,L,D) {
	var subrendI = tkas_subrend(T,L,D,0);
	var subrendR = tkas_subrend(T,L,D,1);
	if (T.subs[0].op == "NUM" && T.subs[0].c == 2) {
		if (D.rendertype == "string") {
			return("sqrt("+subrendR+")");
			}
		else if (D.rendertype == "tex") {
			return("\\sqrt{"+subrendR+"}");
			}
		else if (D.rendertype == "html") {
			return(tkas_render_html_root("<span style='visibility:hidden'>"+subrendI+"</span>",subrendR));
			}
		}
	if (D.rendertype == "string") {
		return("root[" + subrendI + "]("+subrendR + ")"); 
		}
	else if (D.rendertype == "tex") {
		return("\\sqrt["+ subrendI + "]{" + subrendR + "}");
		}
	else if (D.rendertype == "html") {
		return(tkas_render_html_root(subrendI,subrendR));
		}
	}

function tkas_render_function(F,A,D) {
	var argstr = "";
	var i;
	for (i = 0; i < A.length; i++) {
		if (i > 0) {argstr += ", ";}
		argstr += A[i];
		}
	if (D.rendertype == "string") {
		return(F + tkas_render_parenify(argstr,D));
		}
	else if (D.rendertype == "tex") {
		return("{"+F+"}{" + tkas_render_parenify(argstr,D) + "}");
		}
	else if (D.rendertype == "html") {
		return(F + tkas_render_parenify(argstr,D));
		}
	}

function tkas_render_APP(T,L,D) {
	var subrendF = tkas_subrend(T,L,D,0);
	var arglist = [];
	var i;
	for (i = 1; i < T.subs.length; i++) {
		arglist.push(tkas_subrend(T,L,D,i));
		}
	return(tkas_render_function(subrendF,arglist,D));
	}

function tkas_render_LOGN(T,L,D) {
	var subrendB = tkas_subrend(T,L,D,0);
	var subrendA = tkas_subrend(T,L,D,1);
	var F = "";
	if (T.subs[0].op == "NUM" && T.subs[0].c == "e") {
		if (D.rendertype == "string") {
			F = "ln";
			}
		else if (D.rendertype == "tex") {
			F = "\\ln";
			}
		else if (D.rendertype == "html") {
			F = "ln<span style='display:none'>" + subrendB + "</span>";
			}
		}
	else if (T.subs[0].op == "NUM" && T.subs[0].c == "10") {
		if (D.rendertype == "string") {
			F = "log";
			}
		else if (D.rendertype == "tex") {
			F = "\\log";
			}
		else if (D.rendertype == "html") {
			F = "log<span style='display:none'>" + subrendB + "</span>";
			}
		}
	else {
		if (D.rendertype == "string") {
			F = "log_" + subrendB;
			}
		else if (D.rendertype == "tex") {
			F = "\\log_" + subrendB;
			}
		else if (D.rendertype == "html") {
			F = "log<sub>"+subrendB+"</sub>";
			}
		}
	return(tkas_render_function(F,[subrendA],D));
	}

function tkas_render_ABS(T,L,D) {
	var subrend = tkas_subrend(T,L,D,0);
	if (D.rendertype == "string") {
		return("|" + subrend + "|");
		}
	else if (D.rendertype == "tex") {
		return("\\left| " + subrend + "\\right| ");
		}
	else if (D.rendertype == "html") {
		return(tkas_render_html_abs(subrend,D));
		}
	}

function tkas_render_DER(T,L,D) {
	var subrend = tkas_subrend(T,L,D,0);
	var v = T.c;
	if (D.rendertype == "string") {
		return("d/d"+v+subrend);
		}
	else if (D.rendertype == "tex") {
		return("\\frac{d}{d"+v+"}"+subrend);
		}
	else if (D.rendertype == "html") {
		return(tkas_render_html_fraction("d","d"+v) + subrend);
		}
	}

function tkas_render_AND(T,L,D) {
	}

function tkas_render_OR(T,L,D) {
	}

function tkas_render_NOT(T,L,D) {
	}

function tkas_render_COMP(T,L,D) {
	var subrendF = tkas_subrend(T,L,D,0);
	var subrendG = tkas_subrend(T,L,D,1);
	if (D.rendertype == "string") {
		return(subrendF + " o " + subrendG);
		}
	else if (D.rendertype == "tex") {
		return(subrendF + "\\circ " + subrendG);
		}
	else if (D.rendertype == "html") {
		return(subrendF + "&#8728;" + subrendG);
		}
	}

var tkas_rel_lookup = { //string, tex, html, js
	"EQ":["=","=","=","=="],
	"LT":["<","<","<","<"],
	"GT":[">",">",">",">"],
	"GEQ":["≥","\\geq ","&ge;",">="],
	"LEQ":["≤","\\leq ","&le;","<="],
	"NEQ":["≠","\\neq ","&ne;","!="],
	"APPROX":["≈","\\approx ","&asymp;"], //js slot intentionally left unfilled
	}

function tkas_render_REL(T,L,D) {
	var subrendL = tkas_subrend(T,L,D,0);
	var subrendR = tkas_subrend(T,L,D,1);
	if (D.rendertype == "string") {
		return(subrendL + " " + tkas_rel_lookup[T.c][0] + " " + subrendR);
		}
	else if (D.rendertype == "tex") {
		return(subrendL + tkas_rel_lookup[T.c][1] + subrendR);
		}
	else if (D.rendertype == "html") {
		return(subrendL + tkas_rel_lookup[T.c][2] + subrendR);
		}
	}

var tkas_default_pgdecor = {rendertype:"html",parentype:"css"};

function tkas_width_height_pair_from_html_string(S) {
	var dummy =  document.createElement("span");
	document.body.appendChild(dummy);
	dummy.innerHTML = S;
	dummy.style.display = "inline-table";
	var rval = dummy.getBoundingClientRect()
	document.body.removeChild(dummy);
	return(rval);
	}

function tkas_add_to_all_in_list(L,n) {
	var i;
	var rval = [];
	for (i = 0; i < L.length; i++) {
		rval.push(l[i]+n);
		}
	return(rval);
	}

function tkas_tdraw_juxtaposetps(tps1, tps2, index, yoffset, TD) {
	var i;
	var rlefts = [];
	var rrights = [];
	var rnodes = [];
	var dist = 0;
	//calculate distance to shift tps2 over
	for (i = 0; i < Math.min(tps1.rights.length,tps2.lefts.length); i++) {
		if (dist < tps1.rights[i] - tps2.lefts[i]+TD.xpad) {dist = tps1.rights[i]-tps2.lefts[i]+TD.xpad;}
		}
	//copy tps1 into "rval"
	for (i = 0; i < tps1.nodes.length; i++) {
		rnodes.push({
			c:tps1.nodes[i].c,
			left:tps1.nodes[i].left,
			right:tps1.nodes[i].right,
			top:tps1.nodes[i].top,
			bottom:tps1.nodes[i].bottom,
			lix:tps1.nodes[i].lix
			});
		}
	//copy tps2 into "rval"
	for (i = 0; i < tps2.nodes.length; i++) {
		rnodes.push({
			c:tps2.nodes[i].c,
			left:tps2.nodes[i].left+dist,
			right:tps2.nodes[i].right+dist,
			top:tps2.nodes[i].top+yoffset,
			bottom:tps2.nodes[i].bottom+yoffset,
			lix:[index,...tps2.nodes[i].lix]
			});
		}
	//update the lefts
	for (i = 0; i < Math.max(tps1.lefts.length,tps2.lefts.length); i++) {
		if (i < tps1.lefts.length) { //if tps1 is there, it's to the left of tps2.
			rlefts.push(tps1.lefts[i]);
			}
		else { //otherwise tps2 is the leftmost node
			rlefts.push(tps2.lefts[i]+dist);
			}
		}
	for (i = 0; i < Math.max(tps1.rights.length,tps2.rights.length); i++) {
		if (i < tps2.rights.length) {
			rrights.push(tps2.rights[i]+dist);
			}
		else {
			rrights.push(tps1.rights[i]);
			}
		}
	return({lefts:rlefts,rights:rrights,nodes:rnodes});
	}

function tkas_tdraw_shift_tps_right(tps,x) {
	var rval = {lefts:[],rights:[],nodes:[]};
	var i;
	for (i = 0; i < tps.lefts.length; i++) {
		rval.lefts.push(tps.lefts[i]+x);
		}
	for (i = 0; i < tps.rights.length; i++) {
		rval.rights.push(tps.rights[i]+x);
		}
	for (i = 0; i < tps.nodes.length; i++) {
		rval.nodes.push({
			c:tps.nodes[i].c,
			left:tps.nodes[i].left+x,
			right:tps.nodes[i].right+x,
			top:tps.nodes[i].top,
			bottom:tps.nodes[i].bottom,
			lix:tps.nodes[i].lix
			});
		}
	return(rval);
	}

function tkas_tdraw_join_tps(c,tpslist,TD) {
	var i;
	var rval = {lefts:[],rights:[],nodes:[]};
	var whpair = tkas_width_height_pair_from_html_string(c)
	var yoffset = whpair.height+TD.ypad //padding;
	var halfwidth = whpair.width/2;
	for (i = 0; i < tpslist.length; i++) {
		rval = tkas_tdraw_juxtaposetps(rval, tpslist[i], i, yoffset, TD);
		}
	var n = 0;
	var center = 0;
	for (i = 0; i < rval.nodes.length; i++) {
		if (TD.centermode == "averageall") {
			center += (rval.nodes[i].left + rval.nodes[i].right);
			n++;
			}
		if (TD.centermode == "averagechildren" && rval.nodes[i].lix.length == 1) {
			center += (rval.nodes[i].left + rval.nodes[i].right);
			n++;
			}
		}
	center = center/(2*n);
	if (rval.nodes.length == 0) {
		center = halfwidth;
		}
	rval.lefts = [center-halfwidth,...rval.lefts];
	rval.rights = [center+halfwidth,...rval.rights];
	rval.nodes = [
		{
			c:c,
			left:center-halfwidth,
			right:center+halfwidth,
			top:0,
			bottom:whpair.height,
			lix:[]
			}
		,...rval.nodes];
	if (halfwidth > center) {
		rval = tkas_tdraw_shift_tps_right(rval,halfwidth-center);
		}
	return(rval);
	}

function tkas_tdraw_flip_tps(tps) {
	var i;
	var ymax = 0;
	var rval = {};
	rval.lefts = tps.lefts;
	rval.rights = tps.rights;
	rval.nodes = [];
	for (i = 0; i < tps.nodes.length; i++) {
		ymax = Math.max(ymax,tps.nodes[i].bottom);
		}
	for (i = 0; i < tps.nodes.length; i++) {
		rval.nodes.push({
			c: tps.nodes[i].c,
			left: tps.nodes[i].left,
			right: tps.nodes[i].right,
			top: ymax-tps.nodes[i].bottom,
			bottom: ymax-tps.nodes[i].top,
			lix: tps.nodes[i].lix
			});
		}
	return(rval);
	}

var tkas_tdraw_default_treedecor = {
	xpad: 30,
	ypad: 30,
	centermode: "averagechildren",
	orientation: "bottomtotop",
	id: "undefined",
	nodetype:"div",
	nodestyle:""
	};

function tkas_tps_from_htree(H,TD) {
	TD = Object.assign({},tkas_tdraw_default_treedecor,TD);
	var i;
	var tpslist = [];
	if ("subs" in H) {
		for (i = 0; i < H.subs.length; i++) {
			tpslist.push(tkas_tps_from_htree(H.subs[i]));
			}
		}
	return(tkas_tdraw_join_tps(H.c,tpslist,TD));
	}

function tkas_htree_from_ptree(T, opts) {
	var defaultoptions = {
		};
	opts = Object.assign({},defaultoptions,opts);
	var c = tkas_render(T,{rendertype:"string"});
	//c = T.op + "<br>" + c;
	c = "<table style='text-align:center;display:inline-table'><tr><td>" + T.op + "</td></tr><tr><td>" + c + "</td></tr></table>";
	var rval = {c:c, subs:[]};
	var i;
	if ("subs" in T) {
		for (i = 0; i < T.subs.length; i++) {
			rval.subs.push(tkas_htree_from_ptree(T.subs[i],opts));
			}
		}
	return(rval);
	}

function tkas_lix_from_id(id) {
	var i;
	var t = id.split("_");
	var rval = [];
	for (i = 2; i < t.length; i++) {
		rval.push(Number(t[i]));
		}
	return(rval);
	}

function tkas_tag_from_id(id) {
	var i;
	var t = id.split("_");
	return(t[1]);
	}

function tkas_id_from_tag_and_lix(tg, L) {
	return("tkasid_"+tg+tkas_six_from_lix(L));
	}

function tkas_tps_and_lix_to_node(tps,L) {
	var i;
	for (i = 0; i < tps.nodes.length; i++) {
		if (tkas_six_from_lix(tps.nodes[i].lix) == tkas_six_from_lix(L)) {return(tps.nodes[i]);}
		}
	return("NOPE");
	}

function tkas_html_from_tps(tps, TD) {
	TD = Object.assign({},tkas_tdraw_default_treedecor,TD);
	if (TD.orientation == "bottomtotop") {
		tps = tkas_tdraw_flip_tps(tps);
		}
	var i;
	var xmax = 0;
	var ymax = 0;
	for (i = 0; i < tps.nodes.length; i++) {
		xmax = Math.max(xmax,tps.nodes[i].right);
		ymax = Math.max(ymax,tps.nodes[i].bottom);
		}
	var rstr = "<"+TD.nodetype+" style='position:relative;width:"+xmax+"px;height:"+ymax+"px;"+TD.nodestyle+"'>";
	rstr += "<svg style='position:absolute;top:0px;left:0px' width="+xmax+"px height="+ymax+"px>";
	rstr += "<g style='stroke:black;stroke-width:2'>";
	for (i = 0; i < tps.nodes.length; i++) {
		if (tps.nodes[i].lix.length != 0) {
			var x1 = (tps.nodes[i].left+tps.nodes[i].right)/2;
			var y1 = (tps.nodes[i].top+tps.nodes[i].bottom)/2;
			var parentnode = tkas_tps_and_lix_to_node(tps,tps.nodes[i].lix.slice(0,-1));
			var x2 = (parentnode.left+parentnode.right)/2;
			var y2 = (parentnode.top+parentnode.bottom)/2;
			//rstr += tkas_rectangle_rectangle_line_magic(tps.nodes[i],parentnode,x1,y1,x2,y2)
			rstr += "<line x1="+x1+" y1="+y1+" x2="+x2+" y2="+y2+"></line>";
			}
		}
	rstr += "</g>";
	rstr += "</svg>";
	for (i = 0; i < tps.nodes.length; i++) {
		rstr += "<span id='" + tkas_id_from_tag_and_lix("T" + TD.id, tps.nodes[i].lix) + "' class='tkas_tree_node' style='position:absolute;";
		//rstr += "<span style='border:1px solid;position:absolute;";
		rstr += "top:" + tps.nodes[i].top + "px;";
		rstr += "left:" + tps.nodes[i].left + "px;";
		rstr += "width:" + (tps.nodes[i].right-tps.nodes[i].left) + "px;";
		rstr += "height:" + (tps.nodes[i].bottom-tps.nodes[i].top) + "px;";
		rstr += "'>";
		rstr += tps.nodes[i].c;
		rstr += "</span>";
		}

	rstr += "</"+TD.nodetype+">";
	return(rstr);
	}

function tkas_lix_from_six(S) {
	var i;
	var t = S.split("_");
	var rval = [];
	for (i = 0; i < t.length; i++) {
		if (t[i] != "") {
			rval.push(Number(t[i]));
			}
		}
	return(rval);
	}

function tkas_six_from_lix(L) {
	var i;
	var s = "";
	for (i = 0; i < L.length; i++) {
		s += "_";
		s += L[i];
		}
	return(s);
	}

function tkas_lix_list(T) {
	var rval = [[]];
	var i, j;
	if ("subs" in T) {
		for (i = 0; i < T.subs.length; i++) {
			var recurse = tkas_lix_list(T.subs[i]);
			for (j = 0; j < recurse.length; j++) {
				rval.push([i,...recurse[j]]);
				}
			}
		}
	return(rval);
	}

function tkas_highlight_mouseout(tagl, T) {
	var i, j;
	var il = tkas_lix_list(T);
	for (i = 0; i < il.length; i++) {
		for (j = 0; j < tagl.length; j++) {
			document.getElementById(tkas_id_from_tag_and_lix(tagl[j], il[i])).classList.remove("tkas_hi");
			}
		}
	}

function tkas_get_hovered_element_taglist(tagl) {
	var l = document.querySelectorAll(":hover");
	if (l.length == 0) {return(false);}
	var minelt = l[0];
	for (i = 0; i < l.length; i++) {
		if (l[i].id && tagl.includes(tkas_tag_from_id(l[i].id)) && minelt.contains(l[i])) {minelt = l[i];}
		}
	return(minelt);
	}

function tkas_highlight_mousemove(tagl,T) {
	tkas_highlight_mouseout(tagl,T);
	var hielt = tkas_get_hovered_element_taglist(tagl);
	var tag = tkas_tag_from_id(hielt.id);
	var L = tkas_lix_from_id(hielt.id);
	if (!(tagl.includes(tag))) {console.log("TKAS_HIGHLIGHT_MOUSEMOVE confused:",e,tagl,T,hielt);}
	var i;
	for (i = 0; i < tagl.length; i++) {
		document.getElementById(tkas_id_from_tag_and_lix(tagl[i],L)).classList.add("tkas_hi");
		}
	}

function tkas_highlight_focus(tagl,T,e) {
	var tag = tkas_tag_from_id(e.target.id);
	var L = tkas_lix_from_id(e.target.id);
	var i;
	for (i = 0; i < tagl.length; i++) {
		if (tagl[i] != tag && tagl[i][0] == "F") {
			document.getElementById(tkas_id_from_tag_and_lix(tagl[i],L)).classList.add("tkas_formula_node_pair_focus")
			}
		else if (tagl[i] != tag && tagl[i][0] == "T") {
			document.getElementById(tkas_id_from_tag_and_lix(tagl[i],L)).classList.add("tkas_formula_node_pair_focus")
			}
		}
	}

function tkas_highlight_blur(tagl,T,e) {
	var tag = tkas_tag_from_id(e.target.id);
	var L = tkas_lix_from_id(e.target.id);
	var i;
	for (i = 0; i < tagl.length; i++) {
		if (tagl[i] != tag && tagl[i][0] == "F") {
			document.getElementById(tkas_id_from_tag_and_lix(tagl[i],L)).classList.remove("tkas_formula_node_pair_focus")
			}
		else if (tagl[i] != tag && tagl[i][0] == "T") {
			document.getElementById(tkas_id_from_tag_and_lix(tagl[i],L)).classList.remove("tkas_formula_node_pair_focus")
			}
		}
	}

function tkas_highlight_get_selected(tagl) {
	var el = tkas_get_selected_element_taglist(tagl);
	return(tkas_lix_from_id(el.id));
	}

function tkas_get_selected_element_taglist(tagl) {
	var l = document.querySelectorAll(":focus");
	if (l.length == 0) {return(false);}
	var minelt = l[0];
	for (i = 0; i < l.length; i++) {
		if (l[i].id && tagl.includes(tkas_tag_from_id(l[i].id)) && minelt.contains(l[i])) {minelt = l[i];}
		}
	return(minelt);
	}

function tkas_highlight(tagl,T,opts) {
	var i,j;
	var l = tkas_lix_list(T);
	for (i = 0; i < tagl.length; i++) {
		if (tagl[i][0] == "F") { //formulas are nested, so only hook into outermost span
			document.getElementById(tkas_id_from_tag_and_lix(tagl[i],[])).addEventListener("mousemove",function(){tkas_highlight_mousemove(tagl,T);});
			document.getElementById(tkas_id_from_tag_and_lix(tagl[i],[])).addEventListener("mouseout",function(){tkas_highlight_mouseout(tagl,T);});
			for (j = 0; j < l.length; j++) {
				document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).classList.add("tkas_formula_node");
				//if(document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).style.margin == "") {document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).style.margin = "2px";}
				}
			}
		else if (tagl[i][0] == "T") { //trees aren't nested, need to hook all spans
			for (j = 0; j < l.length; j++) {
				document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).addEventListener("mousemove",function(){tkas_highlight_mousemove(tagl,T);});
				document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).addEventListener("mouseout",function(){tkas_highlight_mouseout(tagl,T);});
				}
			}
		}
	if (opts && "select" in opts && opts.select) {
		for (i = 0; i < tagl.length; i++) {
			if (tagl[i][0] == "F") {
				for (j = 0; j < l.length; j++) {
					document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).tabIndex = 0;
					document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).addEventListener("focus",function(e){tkas_highlight_focus(tagl,T,e)});
					document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).addEventListener("blur",function(e){tkas_highlight_blur(tagl,T,e)});
					}
				}
			else if (tagl[i][0] == "T") {
				for (j = 0; j < l.length; j++) {
					document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).tabIndex = 0;
					document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).addEventListener("focus",function(e){tkas_highlight_focus(tagl,T,e)});
					document.getElementById(tkas_id_from_tag_and_lix(tagl[i],l[j])).addEventListener("blur",function(e){tkas_highlight_blur(tagl,T,e)});
					}
				}
			}
		}

	}

function tkas_colorify(tagl,T) {
	var l = tkas_lix_list(T);
	var i,j;
	var s;
	for (i = 0; i < l.length; i++) {
		s = "hsl("+360*i/l.length+",100%,72%)";
		for (j = 0; j < tagl.length; j++) {
			document.getElementById(tkas_id_from_tag_and_lix(tagl[j],l[i])).style.backgroundColor = s;
			}
		}
	}

function tkas_line_intersection(x1,y1,x2,y2,x3,y3,x4,y4) {
	var t = ((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
	var u = -((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
	if (0 <= t && t <= 1 && 0 <= u && u <= 1) {
		return([x1+t*(x2-x1),y1+t*(y2-y1)]);
		}
	else {
		return(false);
		}
	}

function tkas_line_rectangle_intersection(r,x1,y1,x2,y2) {
	return(	tkas_line_intersection(x1,y1,x2,y2,r.left,r.top,r.right,r.top) ||
		tkas_line_intersection(x1,y1,x2,y2,r.left,r.bottom,r.right,r.bottom) ||
		tkas_line_intersection(x1,y1,x2,y2,r.left,r.top,r.left,r.bottom) ||
		tkas_line_intersection(x1,y1,x2,y2,r.right,r.top,r.right,r.bottom));
	}

function tkas_rectangle_rectangle_line_magic(r1,r2,x1,y1,x2,y2) {
	var p1 = tkas_line_rectangle_intersection(r1,x1,y1,x2,y2);
	var p2 = tkas_line_rectangle_intersection(r2,x1,y1,x2,y2);
	return("<line x1="+p1[0]+" y1="+p1[1]+" x2="+p2[0]+" y2="+p2[1]+"></line>");
	}


function tkas_print_lexlist(LL) {
	var rstr = "<table border=1><tr>";
	var i;
	for (i = 0; i < LL.length; i++) {
		rstr += "<td>" + i + ":" + LL[i][0] + "</td>";
		}
	rstr += "</tr><tr>";
	for (i = 0; i < LL.length; i++) {
		rstr += "<td>";
		if (LL[i][0] == "S" || LL[i][0] == "F" || LL[i][0] == "B") {
			rstr += tkas_html_from_tps(tkas_tps_from_htree(tkas_htree_from_ptree(LL[i][1])));
			}
		else {
			rstr +=  LL[i][1];
			}
		rstr += "</td>";
		}
	rstr += "</tr></table>";
	return(rstr);
	}

var tkas_re_add = ["+",/\+/];
var tkas_re_mul = ["*",/\*/];
var tkas_re_neg = ["-",/-/];
var tkas_re_div = ["/",/\//];
var tkas_re_pow = ["^",/\^/];
var tkas_re_lparen = ["(",/\(/];
var tkas_re_rparen = [")",/\)/];
var tkas_re_funs = ["F",/sqrt|root|ln|log|(a?(sin|cos|tan|cot|sec|csc)h?)|abs|cbrt|ceil|exp|floor|max|min|round|sign/];
var tkas_re_consts = ["C",/pi|e/];
var tkas_re_number = ["N",/\d+\.\d*|\d+|\.\d*/];
var tkas_re_var = ["V",/[A-Za-z]/];
var tkas_re_comma = [",",/,/];
var tkas_re_abs = ["|",/\|/];
var tkas_re_rel = ["=",/>=|<=|>|<|=|!=/];
var tkas_rel_lexemes = [
	tkas_re_add,
	tkas_re_mul,
	tkas_re_neg,
	tkas_re_div,
	tkas_re_pow,
	tkas_re_lparen,
	tkas_re_rparen,
	tkas_re_funs,
	tkas_re_consts, //needs to go before tkas_re_var so that e gets parsed as a const.
	tkas_re_number,
	tkas_re_var,
	tkas_re_comma,
	tkas_re_abs,
	tkas_re_rel,
	];
var tkas_re_space = /\s/;
var tkas_re_innerparen = /\([^()]*\)/;

function tkas_reverse_match(re,str,fz) {
	fz = fz || [0,str.length-1];
	var i;
	var rval = null;
	var m;
	for (i = fz[0]; i <= fz[1]; i++) {
		var m = tkas_forward_match(re,str,[i,fz[1]]);
		if (m) {rval = m};
		}
	return(rval);
	}

function tkas_forward_match(re,str,fz) {
	fz = fz || [0,str.length-1];
	var r = new RegExp(re.source, "g");
	r.lastIndex = fz[0];
	var rval = r.exec(str);
	if (rval && (rval.index+rval[0].length-1) > fz[1]) {return(null);}
	return(rval);
	}

function tkas_lex_once(L,str) {
	if (str.search(tkas_re_space) == 0) {
		return([L,str.slice(1)]);
		}
	var i;
	for (i = 0; i < tkas_rel_lexemes.length; i++) {
		m = str.match(tkas_rel_lexemes[i][1]);
		if (m && m.index == 0) {
			return([[...L,tkas_lex_ptreeify([tkas_rel_lexemes[i][0],m[0]])],str.slice(m[0].length)]);
			}
		}
	console.log("TKAS_LEX_ONCE ERROR: LEXEME NOT FOUND");
	}

function tkas_lex(str) {
	var rval = [];
	var o;
	while (str.length > 0) {
		o = tkas_lex_once(rval,str);
		rval = o[0];
		str = o[1];
		}
	return(rval);
	}

function tkas_lex_ptreeify(L) {
	if (L[0] == "F") {return(["F",{op:"FUN",c:L[1]}]);}
	if (L[0] == "C") {return(["S",{op:"NUM",c:L[1]}]);}
	if (L[0] == "N") {return(["S",{op:"NUM",c:Number(L[1])}]);}
	if (L[0] == "V") {return(["S",{op:"VAR",c:L[1]}]);}
	else {return(L);}
	}

function tkas_parse_project(L) {
	var i;
	var r = "";
	for (i = 0; i < L.length; i++) {
		r += L[i][0];
		}
	return(r);
	}

function tkas_parse_find_paren_focuszone(L) {
	var str = tkas_parse_project(L);
	var m = str.match(tkas_re_innerparen);
	if (m) {
		return(tkas_fz(m));
		}
	else {
		return([0,str.length-1]);
		}
	}

function tkas_parse_merge(L,fz,newT) {
	return([...L.slice(0,fz[0]),newT,...L.slice(fz[1]+1)]);
	}

function tkas_parse_focus(L,fz) {
	return(L.slice(fz[0],fz[1]+1));
	}

function tkas_fz(m) {
	if ("index" in m) {
		return([m.index,m.index+m[0].length-1]);
		}
	return([0,m.length-1]);
	}

function tkas_parse_find_parentheses(L,fz) {
	var s = tkas_parse_project(L);
	var re = new RegExp(/\(S\)/);
	var m = tkas_forward_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_parentheses(L,fz) {
	var pf = tkas_parse_find_parentheses(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = zoom[1];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_parse_find_rel(L,fz) {
	var s = tkas_parse_project(L);
	var re = new RegExp(/S=S/);
	var m = tkas_forward_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_rel(L,fz) {
	var pf = tkas_parse_find_rel(L,fz);
	var lookup = {
		"=":"EQ",
		">":"GT",
		"<":"LT",
		">=":"GEQ",
		"<=":"LEQ",
		"!=":"NEQ",
		};
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["B",{op:"REL", c:lookup[zoom[1][1]], subs:[zoom[0][1],zoom[2][1]]}];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_parse_find_abs(L,fz) {
	var s = tkas_parse_project(L);
	var re = new RegExp(/\|S\|/);
	var m = tkas_forward_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_abs(L,fz) {
	var pf = tkas_parse_find_abs(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["S",{op:"ABS",subs:[zoom[1][1]]}];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_parse_find_function(L,fz) {
	var s = tkas_parse_project(L);
	var re = /FS/;
	var m = tkas_forward_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_function(L,fz) {
	var pf = tkas_parse_find_function(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["S",{op:"APP",subs:[zoom[0][1],zoom[1][1]]}];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_parse_find_long_function(L,fz) {
	var s = tkas_parse_project(L);
	var re = /F\(S(,S)*\)/;
	m = tkas_forward_match(re,s,[fz[0]-1,fz[1]]);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_long_function(L,fz) {
	var pf = tkas_parse_find_long_function(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["S",{op:"APP",subs:[]}];
		var i;
		for (i = 0; i < zoom.length; i++) {
			newT[1].subs.push(zoom[i][1]);
			i++;
			}
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_parse_find_exponent(L,fz) {
	var s = tkas_parse_project(L);
	var re = /S\^S/;
	var m = tkas_reverse_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_exponent(L,fz) {
	var pf = tkas_parse_find_exponent(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["S",{op:"POW",subs:[zoom[0][1],zoom[2][1]]}];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_merge_md(L) {
	var rval = {op:"MUL",subs:[L[0][1]]};
	var i;
	for (i = 1; i < L.length; i++) {
		if (L[i][0] == "S") {//implicit multiplication or fall through *-multiplication
			if (rval.op == "MUL") {
				rval.subs.push(L[i][1]);
				}
			else {
				rval = {op:"MUL",subs:[rval,L[i][1]]};
				}
			}
		else if (L[i][0] == "/") {
			i++;
			rval = {op:"DIV",subs:[rval,L[i][1]]};
			}
		}
	return(rval);
	}

function tkas_parse_find_md(L,fz) {
	var s = tkas_parse_project(L);
	var re = /S(S|\*S|\/S)+/;
	var m = tkas_forward_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_md(L,fz) {
	var pf = tkas_parse_find_md(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["S",tkas_merge_md(zoom)];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_merge_as(L) {
	if (L.length == 2 && L[0][0] == "-" && L[1][0] == "S") {
		return({op:"NEG",subs:[L[1][1]]});
		}
	var rval = {op:"ADD",subs:[]};
	var i;
	for (i = 0; i < L.length; i++) {
		if (L[i][0] == "S") {
			if (i != 0) {console.log("TKAS_MERGE_AS PARITY ERROR");}
			rval.subs.push(L[i][1]);
			}
		else if (L[i][0] == "+") {
			i++;
			rval.subs.push(L[i][1]);
			}
		else if (L[i][0] == "-") {
			i++;
			rval.subs.push({op:"NEG",subs:[L[i][1]]});
			}
		}
	return(rval);
	}

function tkas_parse_find_as(L,fz) {
	var s = tkas_parse_project(L);
	var re = /-S|[\+-]?S(\+S|-S)+/
	var m = tkas_forward_match(re,s,fz);
	if (m) {return(tkas_fz(m));}
	return(false);
	}

function tkas_pemdas_as(L,fz) {
	var pf = tkas_parse_find_as(L,fz);
	if (pf) {
		var zoom = tkas_parse_focus(L,pf);
		var newT = ["S",tkas_merge_as(zoom)];
		return(tkas_parse_merge(L,pf,newT));
		}
	return(false);
	}

function tkas_pemdas(L) {
	var fz = tkas_parse_find_paren_focuszone(L);
	return(
		tkas_pemdas_function(L,fz) ||
		tkas_pemdas_abs(L,fz) ||
		tkas_pemdas_long_function(L,fz) ||
		tkas_pemdas_parentheses(L,fz) || 
		tkas_pemdas_exponent(L,fz) ||
		tkas_pemdas_md(L,fz) ||
		tkas_pemdas_as(L,fz) ||
		tkas_pemdas_rel(L,fz)
		);
	}

function tkas_parse_cleanup(T,opts) {
	var rval = {};
	var i;
	if (T.op == "NEG" && opts && "negmagic" in opts) {
		if (T.subs[0].op == "NUM" && !isNaN(T.subs[0].c)) {
			return({op:"NUM",c:-T.subs[0].c});
			}
		if (T.subs[0].op == "MUL" && T.subs[0].subs[0].op == "NUM" && !isNaN(T.subs[0].subs[0].c)) {
			rval.op = "MUL";
			rval.subs = [{op:"NUM",c:-T.subs[0].subs[0].c}];
			for (i = 1; i < T.subs[0].subs.length; i++) {
				rval.subs.push(tkas_parse_cleanup(T.subs[0].subs[i],opts));
				}
			return(rval);
			}
		}
	if (T.op == "NUM" && T.c == "e" && opts && "vare" in opts && opts.vare) {
		return({op:"VAR", c:"e"});
		}
	if (T.op == "VAR" && opts && "consts" in opts && opts.consts.indexOf(T.c) != -1) {
		return({op:"NUM", c:T.c});
		}
	if (T.op == "VAR" && opts && "realmatches" in opts && opts.realmatches.indexOf(T.c) != -1) {
		return({op:"VAR", c:"r"+opts.realmatches.indexOf(T.c)});
		}
	if (T.op == "APP" && T.subs[0].op == "FUN" && T.subs[0].c == "sqrt") {
		rval.op = "ROOT"
		rval.subs = [{op:"NUM",c:2}, tkas_parse_cleanup(T.subs[1],opts)];
		return(rval);
		}
	if (T.op == "APP" && T.subs[0].op == "FUN" && T.subs[0].c == "root") {
		rval.op = "ROOT"
		rval.subs = [tkas_parse_cleanup(T.subs[1],opts),tkas_parse_cleanup(T.subs[2],opts)];
		return(rval);
		}
	if (T.op == "APP" && T.subs[0].op == "FUN" && T.subs[0].c == "abs") {
		rval.op = "ABS"
		rval.subs = [tkas_parse_cleanup(T.subs[1],opts)];
		return(rval);
		}
	if (T.op == "APP" && T.subs[0].op == "FUN" && T.subs[0].c == "ln") {
		rval.op = "LOGN"
		rval.subs = [{op:"NUM", c:"e"},tkas_parse_cleanup(T.subs[1],opts)];
		return(rval);
		}
	if (T.op == "APP" && T.subs[0].op == "FUN" && T.subs[0].c == "log" && T.subs.length == 2) {
		rval.op = "LOGN"
		rval.subs = [{op:"NUM", c:10},tkas_parse_cleanup(T.subs[1],opts)];
		return(rval);
		}
	if (T.op == "APP" && T.subs[0].op == "FUN" && T.subs[0].c == "log" && T.subs.length == 3) {
		rval.op = "LOGN"
		rval.subs = [tkas_parse_cleanup(T.subs[1],opts),tkas_parse_cleanup(T.subs[2],opts)];
		return(rval);
		}
	for (i in T) {
		rval[i] = T[i];
		}
	if ("subs" in T) {
		rval.subs = [];
		for (i = 0; i < T.subs.length; i++) {
			rval.subs.push(tkas_parse_cleanup(T.subs[i],opts));
			}
		}
	return(rval);
	}

function tkas_parse(str,opts) {
	var p = tkas_lex(str);
	var lastgood = p;
	var o = tkas_pemdas(p);
	while(o) {
		console.log(o);
		lastgood = o;
		o = tkas_pemdas(o);
		}
	console.log(lastgood);
	if (lastgood.length == 0) {return(false)}
	return(tkas_parse_cleanup(lastgood[0][1],opts));
	}

function tkas_composition_list(T) { //assumes T is a COMP or FUN node. produces a list of FUN nodes from left to right
	if (T.op == "FUN") {return([T]);}
	if (T.op == "COMP") {
		var rval = [];
		var i;
		for (i = 0; i < T.subs.length; i++) {
			rval.push(tkas_composition_list(T.subs[i]));
			}
		return(rval);
		}
	}

function tkas_js_from_funname(str) {
	if (/^(sin|cos|tan|cot|sec|csc)$/.test(str)) {return("Math."+str);} //redundant, please leave
	if (/^a?(sin|cos|tan|cot|sec|csc)h?$/.test(str)) {return("Math."+str);}
	if (/cbrt|ceil|exp|floor|max|min|round|sign|sqrt/) {return("Math."+str);}
	return(str);
	}

function tkas_js_from_ptree(T,opts) {
	var sublist = [];
	var i;
	var rstr = "";
	if ("subs" in T) {
		for (i = 0; i < T.subs.length; i++) {
			sublist.push("("+tkas_js_from_ptree(T.subs[i],opts)+")");
			}
		}
	if (T.op == "ADD") {
		for (i = 0; i < sublist.length; i++) {
			if (i > 0 && T.subs[i].op != "NEG") {rstr += " + " + sublist[i];}
			else if (i > 0 && T.subs[i].op == "NEG") {rstr += " - " + tkas_js_from_ptree(T.subs[i].subs[0],opts);}
			else {rstr += sublist[i]}
			}
		}
	if (T.op == "MUL") {
		for (i = 0; i < sublist.length; i++) {
			if (i > 0) {rstr += " * ";}
			rstr += sublist[i];
			}
		}
	if (T.op == "NEG") {
		rstr = "-" + sublist[i];
		}
	if (T.op == "DIV") {
		rstr = sublist[0] + "/" + sublist[1];
		}
	if (T.op == "POW") {
		if (opts && "smartpow" in opts && opts.smartpow && T.subs[1].op == "NUM" && Number.isInteger(T.subs[1].c)) {
			if (T.subs[1].c == 0) {rstr = "1";}
			if (T.subs[1].c > 0) {
				for (i = 0; i < T.subs[1].c; i++) {
					if (i > 0) {rstr += "*"}
					rstr += sublist[0];
					}
				}
			if (T.subs[1].c < 0) {
				for (i = 0; i < -T.subs[1].c; i++) {
					if (i > 0) {rstr += "*"}
					rstr += sublist[0];
					}
				rstr = "1/("+rstr+")";
				}
			}
		else {
			rstr = "Math.pow("+sublist[0]+","+sublist[1]+")";
			}
		}
	if (T.op == "ROOT") {
		if (T.subs[0].op == "NUM" && T.subs[0].c == "2") {
			rstr = "Math.sqrt("+sublist[1]+")";
			}
		else {
			rstr = "Math.pow("+sublist[1]+",1/"+sublist[0]+")";
			}
		}
	if (T.op == "LOGN") {
		if (T.subs[0].op == "NUM" && T.subs[0].c == "e") {
			rstr = "Math.log("+sublist[1]+")";
			}
		else if (T.subs[0].op == "NUM" && T.subs[0].c == "10") {
			rstr = "Math.log10("+sublist[1]+")";
			}
		else {
			rstr = "Math.log("+sublist[1]+")/Math.log("+sublist[0]+")";
			}
		}
	if (T.op == "ABS") {
		rstr = "Math.abs("+sublist[0]+")";
		}
	if (T.op == "REL") {
		rstr = sublist[0] + tkas_rel_lookup(T.c)[3] + sublist[1];
		}
	if (T.op == "VAR") {
		rstr = T.c;
		}
	if (T.op == "NUM") {
		if (T.c == "pi") {rstr = "Math.PI";}
		if (T.c == "e") {rstr = "Math.E";}
		rstr = T.c;
		}
	if (T.op == "APP") {
		var l = tkas_composition_list(T.subs[0]);
		for (i = 0; i < l.length; i++) {
			rstr += tkas_js_from_funname(l[i].c) + "(";
			}
		for (i = 1; i < T.subs.length; i++) {
			if (i > 1) {rstr += ","}
			rstr += sublist[i];
			}
		for (i = 0; i < l.length; i++) {
			rstr += ")";
			}
		}
	if (T.op == "AND") {
		for (i = 0; i < T.subs.length; i++) {
			if (i > 0) {rstr += "&&";}
			rstr += sublist[i];
			}
		}
	if (T.op == "OR") {
		for (i = 0; i < T.subs.length; i++) {
			if (i > 0) {rstr += "||";}
			rstr += sublist[i];
			}
		}
	if (T.op == "NOT") {
		rstr = "!" + sublist[0];
		}
	return(rstr);
	}

var tkas_restriction_polynomial = {
	ADD:true,
	MUL:true,
	NEG:true,
	POW:true,
	natexp:true,
	VAR:true,
	NUM:true,
	}

var tkas_restriction_diophantine = {
	ADD:true,
	MUL:true,
	NEG:true,
	POW:true,
	natexp:true,
	VAR:true,
	NUM:true,
	intonly:true,
	}

function tkas_restriction_test(T,al) {
	if (!(T.op in al) || !(al[T.op])) {return(false);}
	var i;
	if ("natexp" in al && al.natexp && T.op == "POW") {
		if (T.subs[1].op != "NUM" || !Number.isInteger(T.subs[1].c) || T.subs[1].c < 0) {return(false);}
		}
	if ("intonly" in al && al.intonly && T.op == "NUM") {
		if (!Number.isInteger(T.c)) {return(false);}
		}
	if ("subs" in T) {
		for (i = 0; i < T.subs.length; i++) {
			if (!tkas_restriction_test(T.subs[i],al)) {return(false);}
			}
		}
	return(true);
	}

function tkas_rule_left_distributivity(T,L) {
	var sT = tkas_ptree_deep_sub(T,L);
	if (sT.op != "MUL") {return(false);}
	if (sT.subs.length != 2) {return(false);}
	if (sT.subs[1].op != "ADD") {return(false);}
	var l = [];
	var i;
	var newT = {op:"ADD", subs:[]};
	var aT = sT.subs[0];
	for (i = 0; i < sT.subs[1].subs.length; i++) {
		newT.subs.push({op:"MUL", subs:[aT, sT.subs[1].subs[i]]});
		}
	return(tkas_ptree_deep_replace(T, L, newT));
	}

function tkas_rule_right_distributivity(T,L) {
	var sT = tkas_ptree_deep_sub(T,L);
	if (sT.op != "MUL") {return(false);}
	if (sT.subs.length != 2) {return(false);}
	if (sT.subs[0].op != "ADD") {return(false);}
	var l = [];
	var i;
	var newT = {op:"ADD", subs:[]};
	var aT = sT.subs[1];
	for (i = 0; i < sT.subs[0].subs.length; i++) {
		newT.subs.push({op:"MUL", subs:[sT.subs[0].subs[i],aT]});
		}
	return(tkas_ptree_deep_replace(T, L, newT));
	}

function tkas_combine_variable_maps(VM1, VM2) {
	if (!VM1 || !VM2) {return(false);}
	var rval = {};
	var i;
	for (i in VM1) {
		rval[i] = VM1[i];
		}
	for (i in VM2) {
		if ((i in VM1) && !(tkas_ptree_equiv(VM2[i],VM1[i]))) {return(false);}
		rval[i] = VM2[i];
		}
	return(rval);
	}

function tkas_rule_grab_variables(R,T) {
	var rval = {};
	var i;
	var o;
	if (R.op == "VAR" && R.c.length > 1 && R.c[0] == "r") {
		if (T.op == "NUM" && !isNaN(T.c)) {rval[R.c] = T; return(rval);}
		else if (T.op == "NEG" && T.subs[0].op == "NUM" && !isNaN(T.subs[0].c)) {
			rval[R.c] = T; return(rval);
			}
		return(false);
		}
	if (R.op == "VAR") {rval[R.c] = T; return(rval);}
	if ("subs" in R) {
		if (!("subs" in T)) {return(false);}
		if (R.op != T.op) {return(false);}
		if (R.subs.length != T.subs.length) {return(false);}
		for (i = 0; i < R.subs.length; i++) {
			o = tkas_rule_grab_variables(R.subs[i],T.subs[i]);
			if (!o) {return(false);}
			rval = tkas_combine_variable_maps(rval,o);
			}
		return(rval);
		}
	if (R.op != T.op) {return(false);}
	if ("c" in R) {
		if (!("c" in T)) {return(false);}
		if (R.c != T.c) {return(false);}
		return({});
		}
	}

function tkas_plugin_variables(R,VM) {
	var rval = {};
	var i;
	if (!("subs" in R)) {
		if (R.op == "VAR" && R.c in VM) {
			return(VM[R.c]);
			}
		return(R);
		}
	for (i in R) {
		rval[i] = R[i];
		}
	rval.subs = [];
	for (i = 0; i < R.subs.length; i++) {
		rval.subs.push(tkas_plugin_variables(R.subs[i],VM));
		}
	return(rval);
	}

function tkas_rule_simple_rule(R,T,L,extraVM) {
	var S = tkas_ptree_deep_sub(T,L);
	var VM = tkas_rule_grab_variables(R.subs[0],S);
	if (!VM) {return(false);}
	VM = Object.assign(VM,extraVM);
	var newS = tkas_plugin_variables(R.subs[1],VM);
	return(tkas_ptree_deep_replace(T, L, newS));
	}

function tkas_rule_calculate(T,L) { //only does exact natural number calculations: don't want users proving 0=1
	var S = tkas_ptree_deep_sub(T,L);
	if (!("subs" in S)) {return(false);}
	var vallist = [];
	var i;
	var k;
	for (i = 0; i < S.subs.length; i++) {
		if (S.subs[i].op != "NUM" && S.subs[i].op != "NEG") {return(false);}
		if (S.subs[i].op == "NUM") {
			k = S.subs[i].c
			}
		if (S.subs[i].op == "NEG") {
			if (S.subs[i].subs[0].op != "NUM") {return(false);}
			k = -S.subs[i].subs[0].c;
			}
		if (!Number.isInteger(k)) {return(false);}
		vallist.push(k);
		}
	var outnum;
	if (S.op == "ADD") {
		outnum = 0;
		for (i = 0; i < vallist.length; i++) {
			outnum += vallist[i];
			}
		}
	if (S.op == "MUL") {
		outnum = 1;
		for (i = 0; i < vallist.length; i++) {
			outnum *= vallist[i];
			}
		}
	//TODO: add more
	//var outT = {op:"NUM", c:outnum};
	var outT = tkas_parse(outnum.toString());
	return(tkas_ptree_deep_replace(T,L,outT));
	}

function tkas_locate_variables(T) { 
	//locates all the variables in T
	//rval[vname] is a list of lixes in T where the variable vname occurs
	//prepends L onto the beginning (optional)
	var rval = {};
	var temp;
	var tv;
	var i,j;
	if (T.op == "VAR") {
		rval[T.c]=[[]];
		return(rval);
		}
	if ("subs" in T) {
		for (i = 0; i < T.subs.length; i++) {
			temp = tkas_locate_variables(T.subs[i]);
			for (tv in temp) {
				if (!(tv in rval)) {
					rval[tv] = [];
					}
				for (j = 0; j < temp[tv].length; j++) {
					rval[tv].push([i].concat(temp[tv][j]));
					}
				}
			}
		}
	return(rval);
	}

function tkas_rule_matching_lixes(R,L) {
	L = L || [];
	//returns an object of pairs of lists of lixes
	//rval[vname][0(1)] is a list of lixes in the LHS(RHS) of R which correspond to the variable vname (with L tacked onto the beginning, for deep rule matching)
	var rval = {};
	var tlvLHS = tkas_locate_variables(R.subs[0]);
	var tlvRHS = tkas_locate_variables(R.subs[1]);
	var v;
	var i;
	for (v in tlvLHS) {
		rval[v] = [[],[]];
		}
	for (v in tlvRHS) {
		rval[v] = [[],[]];
		}
	for (v in tlvLHS) {
		for (i = 0; i < tlvLHS[v].length; i++) {
			rval[v][0].push(L.concat(tlvLHS[v][i]));
			}
		}
	for (v in tlvRHS) {
		for (i = 0; i < tlvRHS[v].length; i++) {
			rval[v][1].push(L.concat(tlvRHS[v][i]));
			}
		}
	return(rval);
	}

function tkas_calc_fake_trml(T,L) {
	L = L || [];
	//returns an object designed to fake the results of tkas_rule_matching_lixes above
	//each vname gives the same singleton list in the RHS.
	var i;
	var rval = {};
	var n = tkas_ptree_deep_sub(T,L).subs.length;
	rval = {a:[[],[L]]};
	for (i = 0; i < n; i++) {
		rval.a[0].push(L.concat([i]));
		}
/*	for (i = 0; i < n; i++) {
		rval["dummy"+i] = [[L.concat([i])],[L]]
		}*/
	console.log(rval);
	return(rval);
	}

function tkas_uncalc_fake_trml(T,L) {
	L = L || [];
	var i;
	var rval = {};
	var n = tkas_ptree_deep_sub(T,L).subs.length;
	rval = {a:[[L],[]]};
	for (i = 0; i < n; i++) {
		rval.a[1].push(L.concat([i]));
		}
	return(rval);
	}

var tkas_simple_rules = [
	{EQ:"(a+b)+c=a+(b+c)",fname:"additive associativity",aname:"shuffle sum"},
	{EQ:"a+(b+c)=(a+b)+c",fname:"additive associativity",aname:"shuffle sum"},
	{EQ:"a+b=b+a",fname:"additive commutativity",aname:"reorder sum"},
	{EQ:"a+0=a",fname:"additive identity",aname:"adding zero"},
	{EQ:"a=a+0",fname:"additive identity",aname:"adding zero"},
	{EQ:"a-a=0",fname:"additive inverse",aname:"subtract to get zero"},
	{EQ:"(ab)c=a(bc)",fname:"multiplicative associativity",aname:"shuffle product"},
	{EQ:"a(bc)=(ab)c",fname:"multiplicative associativity",aname:"shuffle product"},
	{EQ:"ab=ba",fname:"multiplicative commutativity",aname:"reorder product"},
	{EQ:"1a=a",fname:"multiplicative identity",aname:"multiplying by 1"},
	{EQ:"a=1a",fname:"multiplicative identity",aname:"multiplying by 1"},
	{EQ:"0a=0",fname:"multiplicative annihilator",aname:"multiplying by 0"},
	{EQ:"0=0a",fname:"multiplicative annihilator",aname:"multiplying by 0"},
	{EQ:"a(b+c)=ab+ac",fname:"left distributivity",aname:"distributing"},
	{EQ:"ab+ac=a(b+c)",fname:"left distributivity",aname:"factoring out"},
	{EQ:"(a+b)c=ac+bc",fname:"right distributivity",aname:"distributing"},
	{EQ:"ac+bc=(a+b)c",fname:"right distributivity",aname:"factoring out"},
	{EQ:"-a=(-1)a",fname:"negation",aname:"multiplying by -1"},
	];

function tkas_rule_immediately_applicable_srules(T,L) {
	var i;
	var o;
	var rval = [];
	for (i = 0; i < tkas_simple_rules.length; i++) {
		o = tkas_rule_simple_rule(tkas_parse(tkas_simple_rules[i].EQ),T,L);
		if (o) {rval.push(o); console.log(tkas_render(o,{rendertype:"string"}))}
		}
	
	return(rval);
	}

var tkas_connector_colors = [//muted scheme from https://personal.sron.nl/~pault/
	//"#CC6677","#332288","#DDCC77","#117733","#88CCEE","#882255","#44AA99","#999933","#AA4499"
	"#117733","#332288","#CC6677","#DDCC77","#88CCEE","#882255","#44AA99","#999933","#AA4499"
	];

function tkas_svg_polylineify(l,options) {
	options = options || "";
	var i;
	var str = "<polyline points='";
	for (i = 0; i < l.length; i++) {
		if (i > 0) {
			str += " ";
			}
		str += l[i][0] + "," + l[i][1];
		}
	str += "' ";
	str += options;
	str += "/>";
	return(str);
	}

function tkas_svg_bezier(l,options) {
	//currently only does 4 points, but feel free to expand using S
	options = options || "";
	var i;
	var str = "<path d='";
	str += "M " + l[0][0] + "," + l[0][1] + " ";
	str += "C " + l[1][0] + "," + l[1][1] + " ";
	str += l[2][0] + "," + l[2][1] + " ";
	str += l[3][0] + "," + l[3][1] + " ";
	str += "' " + options + "/>";
	return(str); 
	}

function tkas_rule_connector(T1,tg1,T2,tg2,R,L,o,holder) {
	o = Object.assign({base:"brackets",connectors:"bezier",bezierconst:0,bracketconst:.1,linewidth:2,bottomgap:.5,calcbezierconst:.4},o);
	if (o.connectors == "line") {o.connectors = "bezier"; o.bezierconst = 0}
	holder = document.getElementById(holder) || document.body;
	//given trees T1, T2, (augmented with first character) tags tg1 tg2, and simple rule equality R being applied at depth L, produces svg string that can be appended to the html to connect the trees.
	//holder is the id of an html element that is used to set up positioning for the svg
	//options 
	//o.base = "brackets","rects","lines"
	//o.connectors = "zigzag","bezier","line" ("bezierstack" is currently unsupported)
	//o.bezierconst: intensity of vertical tangency
	//o.bracketconst: length of brackets
	//o.bottomgap: fraction of space between used for vertical connector in "calc" case
	var e1 = document.getElementById(tkas_id_from_tag_and_lix(tg1,[]));
	var e2 = document.getElementById(tkas_id_from_tag_and_lix(tg2,[]));
	var r1 = e1.getBoundingClientRect();
	var r2 = e2.getBoundingClientRect();
	var minx = Math.min(r1.left,r2.left)-o.linewidth;
	var maxx = Math.max(r1.right,r2.right)+o.linewidth;
	var miny = Math.min(r1.top,r2.top)-o.linewidth;
	var maxy = Math.max(r1.bottom,r2.bottom)+o.linewidth;
	var hr = holder.getBoundingClientRect();
	var hstyl = window.getComputedStyle(holder);
	var etop = miny-hr.top+Number(hstyl.marginTop.slice(0,-2));
	var eleft = minx-hr.left+Number(hstyl.marginLeft.slice(0,-2));
	var str = "<svg style='pointer-events:none;position:absolute;top:"+etop+"px;left:"+eleft+"px' width="+(maxx-minx)+"px height="+(maxy-miny)+"px>";
	var v,i,j,e,r,rx,ry,rw,rh;
	var topbot = r1.bottom-etop+window.scrollY;
	var bottop = r2.top-etop+window.scrollY;
	var bgpix = 0; //gap between the fake bottom of the connector and the actual bottom, in pixels
	if (R == "calc") {
		bgpix = o.bottomgap*(bottop-topbot);
		if (o.connectors != "line") {o.bezierconst = o.calcbezierconst;}
		var trml = tkas_calc_fake_trml(T1,L);
		}
	else if (R == "uncalc") {
		var trml = tkas_uncalc_fake_trml(T2,L);
		console.log("hi",trml);
		}
	else {
		var trml = tkas_rule_matching_lixes(R,L);
		}
	console.log(o);
	var colorindex = -1;
	var currentvarnum = -1;
	var numvars = 0;
	for (v in trml) {
		numvars++;
		}
	for (v in trml) {
		currentvarnum++;
		colorindex++;
		var color = tkas_connector_colors[colorindex%tkas_connector_colors.length];
		var opts = "fill='none' stroke='"+color+"' stroke-width='"+o.linewidth+"px'";
		for (i = 0; i < trml[v][0].length; i++) {
			e = document.getElementById(tkas_id_from_tag_and_lix(tg1,trml[v][0][i]));
			r = e.getBoundingClientRect();
			rx = r.left-minx;
			ry = r.top-miny;
			rw = r.width;
			rh = r.height;
			if (o.base == "rects") {
				str += "<rect x='"+rx+"' y='"+ry+"' width='"+rw+"' height='"+rh+"' " + opts + "/>";
				}
			if (o.base == "brackets") {
				str += tkas_svg_polylineify([[rx,ry+(1-o.bracketconst)*rh],[rx,ry+rh],[rx+rw,ry+rh],[rx+rw,ry+(1-o.bracketconst)*rh]], opts);
				}
			if (o.base == "lines") {
				str += tkas_svg_polylineify([[rx,ry+rh],[rx+rw,ry+rh]], opts);
				}
			}
		for (i = 0; i < trml[v][1].length; i++) {
			e = document.getElementById(tkas_id_from_tag_and_lix(tg2,trml[v][1][i]));
			r = e.getBoundingClientRect();
			rx = r.left-minx;
			ry = r.top-miny;
			rw = r.width;
			rh = r.height;
			if (o.base == "rects") {
				str += "<rect x='"+rx+"' y='"+ry+"' width='"+rw+"' height='"+rh+"' " + opts + "/>";
				}
			if (o.base == "brackets") {
				str += tkas_svg_polylineify([[rx,ry+o.bracketconst*rh],[rx,ry],[rx+rw,ry],[rx+rw,ry+o.bracketconst*rh]], opts);
				}
			if (o.base == "lines") {
				str += tkas_svg_polylineify([[rx,ry],[rx+rw,ry]], opts);
				}
			}
		for (i = 0; i < trml[v][1].length; i++) {
			e = document.getElementById(tkas_id_from_tag_and_lix(tg2,trml[v][1][i]));
			r = e.getBoundingClientRect();
			rx = r.left-minx;
			ry = r.top-miny;
			rw = r.width;
			rh = r.height;
			var midx = rx+rw/2;
			str += tkas_svg_polylineify([[midx,ry],[midx,ry-bgpix]],opts);
			}
		if (o.connectors == "zigzag") {
			var connectxmax = -Infinity;
			var connectxmin = Infinity;
			var topbot = r1.bottom-miny;
			var bottop = r2.top-miny-bgpix;
			var vary = topbot + ((3+currentvarnum)/(5+numvars))*(bottop-topbot);
			for (i = 0; i < trml[v][0].length; i++) {
				e = document.getElementById(tkas_id_from_tag_and_lix(tg1,trml[v][0][i]));
				r = e.getBoundingClientRect();
				rx = r.left-minx;
				ry = r.top-miny;
				rw = r.width;
				rh = r.height;
				var midx = rx+rw/2;
				connectxmax = Math.max(midx, connectxmax);
				connectxmin = Math.min(midx, connectxmin);
				str += tkas_svg_polylineify([[midx,ry+rh],[midx,vary]],opts);
				}
			for (i = 0; i < trml[v][1].length; i++) {
				e = document.getElementById(tkas_id_from_tag_and_lix(tg2,trml[v][1][i]));
				r = e.getBoundingClientRect();
				rx = r.left-minx;
				ry = r.top-miny;
				rw = r.width;
				rh = r.height;
				var midx = rx+rw/2;
				connectxmax = Math.max(midx, connectxmax);
				connectxmin = Math.min(midx, connectxmin);
				str += tkas_svg_polylineify([[midx,ry-bgpix],[midx,vary]],opts);
				}
			str += tkas_svg_polylineify([[connectxmin,vary],[connectxmax,vary]],opts);
			}
		if (o.connectors == "bezier") {
			for (i = 0; i < trml[v][0].length; i++) {
				for (j = 0; j < trml[v][1].length; j++) {
					var e0 = document.getElementById(tkas_id_from_tag_and_lix(tg1,trml[v][0][i]));
					var r0 = e0.getBoundingClientRect();
					var rx0 = r0.left-minx;
					var ry0 = r0.top-miny;
					var rw0 = r0.width;
					var rh0 = r0.height;
					var e1 = document.getElementById(tkas_id_from_tag_and_lix(tg2,trml[v][1][j]));
					var r1 = e1.getBoundingClientRect();
					var rx1 = r1.left-minx;
					var ry1 = r1.top-miny;
					var rw1 = r1.width;
					var rh1 = r1.height;
					var hd = r1.top - r0.bottom;
					str += tkas_svg_bezier([[rx0+rw0/2,ry0+rh0],[rx0+rw0/2,ry0+rh0+o.bezierconst*hd],[rx1+rw1/2,ry1-o.bezierconst*hd-bgpix],[rx1+rw1/2,ry1-bgpix]], opts);
					}
				}
			}
		if (o.connectors == "bezierstack") { //unsupported
			var topbot = r1.bottom-etop+window.scrollY;
			var bottop = r2.top-etop+window.scrollY;
			var vary = topbot + ((3+currentvarnum)/(5+numvars))*(bottop-topbot);
			for (i = 0; i < trml[v][0].length; i++) {
				for (j = 0; j < trml[v][1].length; j++) {
					var e0 = document.getElementById(tkas_id_from_tag_and_lix(tg1,trml[v][0][i]));
					var r0 = e0.getBoundingClientRect();
					var rx0 = r0.left-minx;
					var ry0 = r0.top-miny;
					var rw0 = r0.width;
					var rh0 = r0.height;
					var e1 = document.getElementById(tkas_id_from_tag_and_lix(tg2,trml[v][1][j]));
					var r1 = e1.getBoundingClientRect();
					var rx1 = r1.left-minx;
					var ry1 = r1.top-miny;
					var rw1 = r1.width;
					var rh1 = r1.height;
					var hd = r1.top - r0.bottom;
					str += tkas_svg_bezier([[rx0+rw0/2,ry0+rh0],[rx0+rw0/2,ry0+rh0+o.bezierconst*hd+(currentvarnum-2)*10],[rx1+rw1/2,ry1-o.bezierconst*hd+(currentvarnum-2)*10],[rx1+rw1/2,ry1]], opts);
					}
				}
			}
		}
	str += "</svg>";
	return(str);
	}

var tkas_overdraw_registry = [];
//each entry has:
//type: "rule_connector" (eventually "tree", other types of rule connectors that don't call tkas_rule_connector
//id: if adding an entry with the same id, overwrites that entry
//rule_connector has:
//T1,tg1,T2,tg2,R,L,o

function tkas_fulfill_overdraw_registry() {
	var i, e;
	if (!(document.getElementById("tkas_overdraw_holder"))) {
		var toh = document.createElement("div");
		toh.id = "tkas_overdraw_holder";
		document.body.appendChild(toh);
		}
	var toh = document.getElementById("tkas_overdraw_holder");
	for (i = 0; i < tkas_overdraw_registry.length; i++) {
		e = tkas_overdraw_registry[i];
		if (e.type == "rule_connector") {
			if (e.holder) {toh = document.getElementById(e.holder);}
			toh.innerHTML += tkas_rule_connector(e.T1,e.tg1,e.T2,e.tg2,e.R,e.L,e.o,e.holder);
			}
		}
	}

function tkas_trc(T1,tg1,T2,tg2,R,L,o,holder) {
	tkas_overdraw_registry.push({type:"rule_connector",T1:T1,tg1:tg1,T2:T2,tg2:tg2,R:R,L:L,o:o,holder:holder});
	}

function tkas_delay_rule_connect(T1,tg1,T2,tg2,R,L,o,holder) {
	requestAnimationFrame(function(){
		var e = document.createElement("span");
		e.innerHTML = tkas_rule_connector(T1,tg1,T2,tg2,R,L,o,holder);
		document.getElementById(holder).append(e);
		});
	}

function tkas_rule_sequence_drawer(T,RL,tag) {
	//RL is a list of objects with type
	//type:"srule" has R:string equation representing rule* L:(lix)
	//tag is a unique tag identifier
	//returns a string and updates the overdraw registry
	// *note: this is wrong since it's 'harder' to unparse than to parse
	var i = 0;
	var TL = [T];
	const CL = [];
	var str = "<span id='tkas_rsd_holder_"+tag+"'>";
	str += tkas_render(TL[0],{id:"tkas_rsd_"+tag+0});
	for (i = 0; i < RL.length; i++) {
		str += "<br><br>";
		TL.push(tkas_rule_simple_rule(tkas_parse(RL[i].R),TL[i],RL[i].L));
		str += tkas_render(TL[i+1],{id:"tkas_rsd_"+tag+(i+1)});
		tkas_delay_rule_connect(TL[i],"Ftkas_rsd_"+tag+i,TL[i+1],"Ftkas_rsd_"+tag+(i+1),tkas_parse(RL[i].R),RL[i].L,{},"tkas_rsd_holder_"+tag);
		//tkas_trc(TL[i],"Ftkas_rsd_"+tag+i,TL[i+1],"Ftkas_rsd_"+tag+(i+1),tkas_parse(RL[i].R),RL[i].L,{},"tkas_rsd_holder_"+tag);
		}
	str += "</span>";
	return(str);
	}



var tkas_css = `
.tkas_svg_parens {
	border-left: .5em solid;
	border-right: .5em solid;
	border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 10 15'%3E%3Ctext x='0' y='11'%3E()%3C/text%3E%3C/svg%3E");
	border-image-slice: 0 50%;
	border-image-repeat: stretch;
	display:inline-block;
	margin: 2px;
	}
.tkas_css_parens {
	border-radius: calc(3px + .06em) / 50%;
	border-left: .02em solid black;
	border-right: .02em solid black;
	display:inline-block;
	margin-left: calc(2px + .05em);
	}
.tkas_fraction {
	font-size: 60%;
	display: inline-table;
	vertical-align: middle;
	border-spacing: 0px
	}
.tkas_numerator {
	border-bottom:solid 2px;
	text-align:center;
	padding:0px;
	padding-left:.1em;
	padding-right:.1em;
	}
.tkas_numerator > span {
	margin-bottom: -7px;
	}
.tkas_denominator {
	text-align:center;
	padding-left:.1em;
	padding-right:.1em;
	}
.tkas_denominator > span {
	margin-top: -5px;
	}

.tkas_squareroot:before {
	pointer-events: none;
	width: 1ch;
	top: -.22em;
	bottom: 0px;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' viewBox='0 0 40 80'%3E%3Cpolyline style='stroke:black;stroke-width:4;fill:none' points='0,25 10,25 20,40 40,2 80,2'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-size: 100% 200%;
	right: 0px;
	left: -1ch;
	position:absolute;
	content:'';
	}
.tkas_squareroot {
	position: relative;
	margin-left: 1.4ch;
	display:inline-block;
	border-top: .22em solid black;
	}
.tkas_squareroot_index {
	font-size: 60%;
	vertical-align: top;
	margin-right: -1.7ch;
	display:inline-block;
	}
.tkas_superscript {
	font-size: calc(2px + 60%);
	vertical-align: top;
	display:inline-block;
	margin-left: -.2em;
	}
.tkas_absolute_value {
	border-left: 2px solid black;
	border-right: 2px solid black;
	display:inline-block;
	}
.tkas_formula_node {
	display:inline-block;
	margin:2px;
	}
.tkas_tree_node {
	background-color: white;
	border: 1px solid;
	}
.tkas_hi {
	background-color: #CCDDAA;
	}
.tkas_tree_node:focus {
	background-color: #BBCCEE;
	outline: 2px solid #225522;
	}
.tkas_formula_node:focus {
	background-color: #BBCCEE;
	outline: 2px solid #225522;
	}
.tkas_formula_node_pair_focus {
	background-color: #BBCCEE;
	outline: 2px solid #225522;
	}
.tkas_tree_node_pair_focus {
	background-color: #BBCCEE;
	outline: 2px solid #225522;
	}
`

function tkas_load_css() {
	var style = document.createElement("style");
	style.type = "text/css";
	style.innerHTML = tkas_css;
	document.getElementsByTagName("head")[0].appendChild(style);
	}

function tkas_boot() {
	tkas_load_css();
	}

tkas_boot();